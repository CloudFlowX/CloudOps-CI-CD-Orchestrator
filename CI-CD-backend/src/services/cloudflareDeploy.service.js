import { exec } from "child_process";
import path from "path";
import fs from "fs";
import axios from "axios";
import { detectBuildDirectory } from "./s3Deploy.service.js";
import logger from "../config/logger.js";

/**
 * Helper to sanitize Cloudflare credentials (strips whitespace, newlines, tabs, and enclosing quotes)
 */
export const sanitizeCloudflareCredential = (val) => {
  if (!val) return "";
  const str = typeof val === "string" ? val : String(val);
  return str.trim().replace(/[\r\n\t\s"']/g, "");
};

/**
 * Sanitize Cloudflare Pages project name (lowercase, alphanumeric, hyphens, 1-28 chars)
 */
export const sanitizePagesProjectName = (rawName) => {
  let name = (rawName || "app")
    .toLowerCase()
    .replace(/\.company$|\.com$|\.org$|\.io$|\.dev$/, "") // clean common domain endings
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (name.length > 28) {
    name = name.substring(0, 28).replace(/-$/, "");
  }

  return name || "cloudops-app";
};

/**
 * Ensure Cloudflare Pages project exists via Cloudflare REST API
 */
export const ensureCloudflareProject = async (accountId, apiToken, projectName, onLog) => {
  const cleanAccountId = sanitizeCloudflareCredential(accountId);
  const cleanApiToken = sanitizeCloudflareCredential(apiToken);
  const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${cleanAccountId}/pages/projects`;
  const headers = {
    Authorization: `Bearer ${cleanApiToken}`,
    "Content-Type": "application/json",
  };

  try {
    onLog(`[CLOUDFLARE] Checking if project "${projectName}" exists on Cloudflare Pages...`);
    const checkRes = await axios.get(`${baseUrl}/${projectName}`, { headers });
    if (checkRes.data?.success) {
      onLog(`[CLOUDFLARE] Project "${projectName}" found on Cloudflare Pages ✓`);
      const subdomain = checkRes.data.result?.subdomain || `${projectName}.pages.dev`;
      return `https://${subdomain}`;
    }
  } catch (err) {
    // 404 means project does not exist yet; we create it
    if (err.response?.status === 404 || err.response?.data?.errors?.[0]?.code === 8000007) {
      onLog(`[CLOUDFLARE] Project "${projectName}" does not exist. Creating new Cloudflare Pages project...`);
      try {
        const createRes = await axios.post(
          baseUrl,
          {
            name: projectName,
            production_branch: "main",
          },
          { headers }
        );
        if (createRes.data?.success) {
          onLog(`[CLOUDFLARE] Project "${projectName}" created successfully on Cloudflare Pages ✓`);
          const subdomain = createRes.data.result?.subdomain || `${projectName}.pages.dev`;
          return `https://${subdomain}`;
        }
      } catch (createErr) {
        onLog(`[WARN] Cloudflare API project create note: ${createErr.response?.data?.errors?.[0]?.message || createErr.message}`);
      }
    } else {
      onLog(`[WARN] Cloudflare API check note: ${err.response?.data?.errors?.[0]?.message || err.message}`);
    }
  }

  return `https://${projectName}.pages.dev`;
};

/**
 * Deploy build directory to Cloudflare Pages using Wrangler CLI
 */
export const deployToCloudflarePages = async ({
  apiToken,
  accountId,
  projectName: customProjectName,
  repoName,
  projectPath,
  onLog = () => {},
}) => {
  const cleanToken = sanitizeCloudflareCredential(apiToken || process.env.CLOUDFLARE_API_TOKEN);
  const cleanAccountId = sanitizeCloudflareCredential(accountId || process.env.CLOUDFLARE_ACCOUNT_ID);

  // Sync to runtime process.env so wrangler or child libraries read sanitized values
  if (cleanAccountId) process.env.CLOUDFLARE_ACCOUNT_ID = cleanAccountId;
  if (cleanToken) process.env.CLOUDFLARE_API_TOKEN = cleanToken;

  if (!cleanToken || !cleanAccountId) {
    const errorMsg =
      "Cloudflare API Token (CLOUDFLARE_API_TOKEN) and Account ID (CLOUDFLARE_ACCOUNT_ID) are required for Cloudflare Pages deployment.";
    onLog(`[ERROR] ${errorMsg}`);
    onLog(`[HINT] 1. Go to dash.cloudflare.com -> Left sidebar -> copy your 'Account ID'.`);
    onLog(`[HINT] 2. Go to My Profile -> API Tokens -> Create Token -> Use 'Cloudflare Pages' template.`);
    onLog(`[HINT] 3. Add CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID to Render / backend .env or connect your Cloudflare account.`);
    throw new Error(errorMsg);
  }

  const projectName = sanitizePagesProjectName(customProjectName || repoName);
  onLog(`[CLOUDFLARE] Initializing Cloudflare Pages deployment for "${projectName}"...`);

  // 1. Ensure project exists in Cloudflare
  const projectUrl = await ensureCloudflareProject(cleanAccountId, cleanToken, projectName, onLog);

  // 2. Locate build directory (dist, build, out, public, or root)
  const buildDir = detectBuildDirectory(projectPath, onLog);
  onLog(`[CLOUDFLARE] Source build directory: ${buildDir}`);

  // Ensure index.html exists in build directory for web hosting
  const indexPath = path.join(buildDir, "index.html");
  if (!fs.existsSync(indexPath)) {
    // If static website has other html files (e.g. home.html), create index.html redirect or copy
    const files = fs.readdirSync(buildDir);
    const anyHtml = files.find((f) => f.endsWith(".html"));
    if (anyHtml) {
      fs.copyFileSync(path.join(buildDir, anyHtml), indexPath);
      onLog(`[CLOUDFLARE] Created index.html from ${anyHtml} for root entrypoint.`);
    } else {
      throw new Error(`Build directory "${buildDir}" does not contain an index.html file.`);
    }
  }

  // 3. Resolve Wrangler executable
  const wranglerBin = path.resolve(
    process.cwd(),
    "node_modules",
    ".bin",
    "wrangler"
  );
  const fallbackBin = "npx wrangler";
  const cmdBinary = fs.existsSync(wranglerBin) ? wranglerBin : fallbackBin;

  onLog(`[CLOUDFLARE] Uploading assets to Cloudflare Edge Network...`);

  // 4. Execute wrangler pages deploy
  const deployCmd = `${cmdBinary} pages deploy "${buildDir}" --project-name="${projectName}" --branch="main" --commit-dirty=true`;

  const env = {
    ...process.env,
    CLOUDFLARE_API_TOKEN: cleanToken,
    CLOUDFLARE_ACCOUNT_ID: cleanAccountId,
    WRANGLER_LOG_PATH: "/tmp/wrangler.log",
    WRANGLER_SEND_METRICS: "false",
    WRANGLER_OUTPUT_FILE_DIRECTORY: "/tmp",
    XDG_CONFIG_HOME: "/tmp",
    CI: "true",
  };

  const stripAnsi = (str) =>
    (str || "").replace(/\x1B\[[0-9;]*[a-zA-Z]/g, "").trim();

  return new Promise((resolve, reject) => {
    const child = exec(deployCmd, { env, cwd: projectPath }, (error, stdout, stderr) => {
      const cleanStdout = stripAnsi(stdout);
      const cleanStderr = stripAnsi(stderr);

      if (cleanStdout) {
        const lines = cleanStdout.split("\n");
        lines.forEach((line) => {
          const l = line.trim();
          if (l) onLog(`[CLOUDFLARE] ${l}`);
        });
      }

      if (cleanStderr && !cleanStderr.includes("wrangler-dist")) {
        onLog(`[CLOUDFLARE] ${cleanStderr}`);
      }

      // Check if deployment was successful
      const isSuccess =
        !error ||
        cleanStdout.includes("Deployment complete") ||
        cleanStdout.includes("Success") ||
        cleanStdout.includes(".pages.dev");

      if (isSuccess) {
        // Extract live URL from stdout if present, or use default pages.dev domain
        const match = cleanStdout.match(/https:\/\/[a-zA-Z0-9.-]+\.pages\.dev/);
        const liveUrl = match ? match[0] : `https://${projectName}.pages.dev`;

        onLog(`[DEPLOY] ====================================================`);
        onLog(`[DEPLOY] 🎉 CLOUDFLARE PAGES DEPLOYMENT SUCCESSFUL!`);
        onLog(`[DEPLOY] Permanent Live URL: ${liveUrl}`);
        onLog(`[DEPLOY] Global Edge CDN • SSL Enabled • 24/7 Mobile Ready`);
        onLog(`[DEPLOY] ====================================================`);

        resolve({
          deployedUrl: liveUrl,
          projectName,
        });
      } else {
        const errMsg = cleanStderr || cleanStdout || error?.message || "Cloudflare Pages deployment failed.";
        onLog(`[ERROR] Cloudflare deployment failed: ${errMsg}`);
        reject(new Error(errMsg));
      }
    });
  });
};
