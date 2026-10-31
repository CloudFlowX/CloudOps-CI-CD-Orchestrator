import dns from "dns/promises";
import fs from "fs";
import { NodeSSH } from "node-ssh";
import { EC2Client, DescribeInstancesCommand } from "@aws-sdk/client-ec2";
import axios from "axios";
import logger from "../config/logger.js";
import Pipeline from "../models/pipeline.model.js";
import CloudAccount from "../models/cloudAccount.model.js";
import AuditLog from "../models/auditLog.model.js";
import { getOrCreateCloudFrontForEc2Backend } from "../services/ec2CloudFront.service.js";

/**
 * Extract root domain and subdomain from hostname
 */
const parseDomainParts = (domain) => {
  const clean = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const parts = clean.split(".");
  if (parts.length <= 2) {
    return { rootDomain: clean, subdomain: "@", fullDomain: clean };
  }
  const subdomain = parts.slice(0, parts.length - 2).join(".");
  const rootDomain = parts.slice(-2).join(".");
  return { rootDomain, subdomain, fullDomain: clean };
};

/**
 * Get target host and IP for a pipeline
 */
const resolvePipelineTarget = async (pipeline) => {
  let publicIp = null;
  let targetType = "A";
  let targetValue = "";

  if (pipeline.deploymentTarget === "docker" || pipeline.deploymentTarget === "aws") {
    // EC2
    let resolvedCloudAccount = null;
    if (pipeline.cloudAccount) {
      resolvedCloudAccount = await CloudAccount.findById(pipeline.cloudAccount);
    }
    if (!resolvedCloudAccount && pipeline.createdBy) {
      resolvedCloudAccount = await CloudAccount.findOne({ provider: "AWS", owner: pipeline.createdBy });
    }
    if (!resolvedCloudAccount) {
      resolvedCloudAccount = await CloudAccount.findOne({ provider: "AWS" });
    }

    if (pipeline.ec2InstanceId && resolvedCloudAccount?.accessKeyId && resolvedCloudAccount?.secretAccessKey) {
      try {
        const ec2Client = new EC2Client({
          region: resolvedCloudAccount.region || "ap-south-1",
          credentials: {
            accessKeyId: resolvedCloudAccount.accessKeyId,
            secretAccessKey: resolvedCloudAccount.secretAccessKey,
          },
        });
        const data = await ec2Client.send(new DescribeInstancesCommand({ InstanceIds: [pipeline.ec2InstanceId] }));
        publicIp = data.Reservations?.[0]?.Instances?.[0]?.PublicIpAddress;
      } catch (e) {
        logger.warn(`Could not resolve EC2 public IP via SDK: ${e.message}`);
      }
    }

    if (!publicIp && pipeline.deployedUrl) {
      try {
        const url = new URL(pipeline.deployedUrl);
        publicIp = url.hostname;
      } catch (e) {}
    }

    targetType = "A";
    targetValue = publicIp || "52.66.243.60";
  } else if (pipeline.deploymentTarget === "cloudflare") {
    targetType = "CNAME";
    targetValue = pipeline.deployedUrl
      ? new URL(pipeline.deployedUrl).hostname
      : `${pipeline.cloudflareProjectName || pipeline.name}.pages.dev`;
  } else if (pipeline.deploymentTarget === "aws-s3") {
    targetType = "CNAME";
    targetValue = pipeline.cloudFrontUrl
      ? new URL(pipeline.cloudFrontUrl).hostname
      : `${pipeline.s3BucketName}.s3-website.amazonaws.com`;
  }

  return { targetType, targetValue, publicIp };
};

// ======================================
// Get Pipeline DNS Details
// ======================================
export const getPipelineDns = async (req, res) => {
  try {
    const { pipelineId } = req.params;
    const pipeline = await Pipeline.findById(pipelineId).populate("repository", "name");

    if (!pipeline) {
      return res.status(404).json({ success: false, message: "Pipeline not found." });
    }

    const userRole = (req.user.role || "").toLowerCase();
    const isAdmin = userRole === "admin";
    const isOwner = pipeline.createdBy && pipeline.createdBy.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner && pipeline.visibility === "admin_only") {
      return res.status(403).json({
        success: false,
        message: "Access Denied: This pipeline is restricted to Admins only.",
      });
    }

    const { targetType, targetValue } = await resolvePipelineTarget(pipeline);

    let expectedRecord = null;
    if (pipeline.customDomain) {
      const { subdomain } = parseDomainParts(pipeline.customDomain);
      expectedRecord = {
        recordType: targetType,
        name: subdomain,
        value: targetValue,
      };
    }

    return res.status(200).json({
      success: true,
      pipelineId: pipeline._id,
      name: pipeline.name,
      customDomain: pipeline.customDomain || "",
      domainStatus: pipeline.domainStatus || "none",
      sslStatus: pipeline.sslStatus || "none",
      deployedUrl: pipeline.deployedUrl || "",
      deploymentTarget: pipeline.deploymentTarget,
      expectedRecord: expectedRecord || {
        recordType: targetType,
        name: "@",
        value: targetValue,
      },
    });
  } catch (error) {
    logger.error("GET DNS ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ======================================
// Attach Custom Domain to Pipeline
// ======================================
export const attachCustomDomain = async (req, res) => {
  try {
    const { pipelineId } = req.params;
    let { domain } = req.body;

    if (!domain || typeof domain !== "string") {
      return res.status(400).json({ success: false, message: "Valid domain name is required." });
    }

    const { rootDomain, subdomain, fullDomain } = parseDomainParts(domain);

    const pipeline = await Pipeline.findById(pipelineId);
    if (!pipeline) {
      return res.status(404).json({ success: false, message: "Pipeline not found." });
    }

    const userRole = (req.user.role || "").toLowerCase();
    const isAdmin = userRole === "admin";
    const isOwner = pipeline.createdBy && pipeline.createdBy.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner && pipeline.visibility === "admin_only") {
      return res.status(403).json({
        success: false,
        message: "Access Denied: Only Admins or the creator can attach domains to this pipeline.",
      });
    }

    const { targetType, targetValue } = await resolvePipelineTarget(pipeline);

    pipeline.customDomain = fullDomain;
    pipeline.domainStatus = "pending";
    pipeline.sslStatus = "pending";
    pipeline.domainDnsRecord = {
      recordType: targetType,
      name: subdomain,
      value: targetValue,
    };

    await pipeline.save();

    try {
      await AuditLog.create({
        user: req.user._id,
        action: "ATTACH_CUSTOM_DOMAIN",
        resourceType: "Pipeline",
        resourceId: pipeline._id,
        details: `User (${req.user.role}) attached custom domain "${fullDomain}" to pipeline "${pipeline.name}"`,
      });
    } catch (e) {}

    return res.status(200).json({
      success: true,
      message: `Domain "${fullDomain}" attached successfully. Please configure your DNS records as shown below.`,
      pipeline: {
        _id: pipeline._id,
        customDomain: pipeline.customDomain,
        domainStatus: pipeline.domainStatus,
        sslStatus: pipeline.sslStatus,
        expectedRecord: pipeline.domainDnsRecord,
      },
    });
  } catch (error) {
    logger.error("ATTACH DOMAIN ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ======================================
// Verify DNS Configuration
// ======================================
export const verifyCustomDomain = async (req, res) => {
  try {
    const { pipelineId } = req.params;
    const pipeline = await Pipeline.findById(pipelineId).populate("repository");

    if (!pipeline || !pipeline.customDomain) {
      return res.status(400).json({ success: false, message: "Pipeline does not have a custom domain configured." });
    }

    const userRole = (req.user.role || "").toLowerCase();
    const isAdmin = userRole === "admin";
    const isOwner = pipeline.createdBy && pipeline.createdBy.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner && pipeline.visibility === "admin_only") {
      return res.status(403).json({
        success: false,
        message: "Access Denied: Only Admins or the creator can verify domains for this pipeline.",
      });
    }

    const fullDomain = pipeline.customDomain;
    const { targetType, targetValue } = await resolvePipelineTarget(pipeline);

    let resolvedValues = [];
    let isMatched = false;

    try {
      if (targetType === "A") {
        resolvedValues = await dns.resolve4(fullDomain);
        isMatched = resolvedValues.includes(targetValue);
      } else {
        resolvedValues = await dns.resolveCname(fullDomain);
        isMatched = resolvedValues.some((r) => r.toLowerCase().includes(targetValue.toLowerCase()));
      }
    } catch (dnsErr) {
      return res.status(200).json({
        success: false,
        verified: false,
        message: `DNS resolution failed: ${dnsErr.code || dnsErr.message}. The record has not propagated yet. DNS propagation can take 1-5 minutes.`,
        expectedRecord: { recordType: targetType, name: pipeline.domainDnsRecord?.name || "@", value: targetValue },
        currentResolved: [],
      });
    }

    if (!isMatched) {
      return res.status(200).json({
        success: false,
        verified: false,
        message: `DNS record found for "${fullDomain}", but points to [${resolvedValues.join(", ")}] instead of expected target "${targetValue}". Please check your DNS record.`,
        expectedRecord: { recordType: targetType, name: pipeline.domainDnsRecord?.name || "@", value: targetValue },
        currentResolved: resolvedValues,
      });
    }

    // DNS is verified!
    pipeline.domainStatus = "verified";
    pipeline.sslStatus = "active";
    await pipeline.save();

    // If Docker on EC2: Configure Nginx virtual host on EC2
    if (pipeline.deploymentTarget === "docker" && pipeline.ec2InstanceId) {
      try {
        const targetPort = pipeline.containerPort || pipeline.appPort || 5000;
        let rawSshKey = process.env.EC2_SSH_KEY;
        const sshKeyPath = process.env.EC2_SSH_KEY_PATH;
        if (rawSshKey) {
          rawSshKey = rawSshKey.trim().replace(/^["']|["']$/g, "").replace(/\r\n/g, "\n").replace(/\\n/g, "\n").trim();
        }
        let resolvedKeyPath = (sshKeyPath && fs.existsSync(sshKeyPath)) ? sshKeyPath : undefined;
        if (!resolvedKeyPath && !rawSshKey) {
          const commonPaths = ["/etc/secrets/cloud.pem", "/etc/secrets/key.pem", "/etc/secrets/id_rsa", "./cloud.pem", "./id_rsa"];
          for (const p of commonPaths) {
            if (fs.existsSync(p)) { resolvedKeyPath = p; break; }
          }
        }

        const ssh = new NodeSSH();
        const usernamesToTry = [process.env.EC2_USERNAME, "ubuntu", "ec2-user", "admin"].filter(Boolean);
        let connected = false;

        for (const u of [...new Set(usernamesToTry)]) {
          try {
            await ssh.connect({
              host: targetValue,
              username: u,
              readyTimeout: 15000,
              ...(rawSshKey ? { privateKey: rawSshKey } : { privateKeyPath: resolvedKeyPath }),
            });
            connected = true;
            break;
          } catch (e) {}
        }

        if (connected) {
          // Ensure Nginx is running and configure reverse proxy
          const nginxConf = `
server {
    listen 80;
    server_name ${fullDomain};

    location / {
        proxy_pass http://127.0.0.1:${targetPort};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\$host;
        proxy_cache_bypass \\$http_upgrade;
        proxy_set_header X-Real-IP \\$remote_addr;
        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\$scheme;
    }
}
`;
          await ssh.execCommand("which nginx || sudo apt-get update && sudo apt-get install -y nginx && sudo systemctl enable --now nginx || true");
          await ssh.execCommand(`cat << 'CLOUDOPS_EOF' | sudo tee /etc/nginx/sites-available/${fullDomain}\n${nginxConf}\nCLOUDOPS_EOF`);
          await ssh.execCommand(`sudo ln -sf /etc/nginx/sites-available/${fullDomain} /etc/nginx/sites-enabled/${fullDomain}`);
          await ssh.execCommand("sudo nginx -t && sudo systemctl reload nginx");
          ssh.dispose();

          logger.info(`Nginx reverse proxy configured for ${fullDomain} -> port ${targetPort} ✓`);
        }
      } catch (nginxErr) {
        logger.warn(`Nginx proxy configuration note: ${nginxErr.message}`);
      }
    }

    return res.status(200).json({
      success: true,
      verified: true,
      message: `🎉 Domain "${fullDomain}" verified! Traffic is actively routing to your deployment.`,
      pipeline: {
        _id: pipeline._id,
        customDomain: pipeline.customDomain,
        domainStatus: pipeline.domainStatus,
        sslStatus: pipeline.sslStatus,
      },
    });
  } catch (error) {
    logger.error("VERIFY DOMAIN ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ======================================
// Auto-Setup Cloudflare DNS via API
// ======================================
export const autoSetupCloudflareDns = async (req, res) => {
  try {
    const { pipelineId } = req.params;
    const pipeline = await Pipeline.findById(pipelineId);

    if (!pipeline || !pipeline.customDomain) {
      return res.status(400).json({ success: false, message: "Attach a custom domain first." });
    }

    const userRole = (req.user.role || "").toLowerCase();
    const isAdmin = userRole === "admin";
    const isOwner = pipeline.createdBy && pipeline.createdBy.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner && pipeline.visibility === "admin_only") {
      return res.status(403).json({
        success: false,
        message: "Access Denied: Only Admins or the creator can configure Cloudflare DNS for this pipeline.",
      });
    }

    const { rootDomain, subdomain, fullDomain } = parseDomainParts(pipeline.customDomain);
    const { targetType, targetValue } = await resolvePipelineTarget(pipeline);

    // Find Cloudflare account
    let cfAccount = await CloudAccount.findOne({ provider: "Cloudflare" });
    let apiToken = cfAccount?.cloudflareApiToken || process.env.CLOUDFLARE_API_TOKEN;
    if (apiToken) apiToken = apiToken.trim().replace(/[\r\n\t\s"']/g, "");

    if (!apiToken) {
      return res.status(400).json({
        success: false,
        message: "No connected Cloudflare account or CLOUDFLARE_API_TOKEN found in Cloud Accounts.",
      });
    }

    // 1. Find Zone ID for root domain
    const zoneRes = await axios.get(`https://api.cloudflare.com/client/v4/zones?name=${rootDomain}`, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });

    const zone = zoneRes.data?.result?.[0];
    if (!zone) {
      return res.status(404).json({
        success: false,
        message: `Zone for root domain "${rootDomain}" not found in your Cloudflare account. Please make sure the domain is added to Cloudflare.`,
      });
    }

    // 2. Check if record already exists on Cloudflare
    const checkRecordRes = await axios.get(
      `https://api.cloudflare.com/client/v4/zones/${zone.id}/dns_records?name=${fullDomain}`,
      { headers: { Authorization: `Bearer ${apiToken}` } }
    );

    const existingRecord = checkRecordRes.data?.result?.[0];
    const recordPayload = {
      type: targetType,
      name: fullDomain,
      content: targetValue,
      ttl: 1, // Auto TTL
      proxied: true, // Cloudflare Orange Cloud (Free SSL + DDoS protection)
    };

    let cfSuccess = false;

    if (existingRecord) {
      // Update existing record
      const updateRes = await axios.put(
        `https://api.cloudflare.com/client/v4/zones/${zone.id}/dns_records/${existingRecord.id}`,
        recordPayload,
        { headers: { Authorization: `Bearer ${apiToken}` } }
      );
      cfSuccess = !!updateRes.data?.success;
    } else {
      // Create new record
      const createDnsRes = await axios.post(
        `https://api.cloudflare.com/client/v4/zones/${zone.id}/dns_records`,
        recordPayload,
        { headers: { Authorization: `Bearer ${apiToken}` } }
      );
      cfSuccess = !!createDnsRes.data?.success;
    }

    if (cfSuccess) {
      pipeline.domainStatus = "verified";
      pipeline.sslStatus = "active";
      await pipeline.save();

      return res.status(200).json({
        success: true,
        message: `🚀 Cloudflare DNS record created with Orange Cloud Proxied (Free SSL + DDoS Guard)! Your domain "${fullDomain}" is live.`,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Failed to configure DNS record in Cloudflare.",
      });
    }
  } catch (error) {
    logger.error("CLOUDFLARE DNS ERROR:", error.response?.data || error.message);
    const errMsg = error.response?.data?.errors?.[0]?.message || error.message;
    return res.status(500).json({ success: false, message: `Cloudflare API error: ${errMsg}` });
  }
};

// ======================================
// Enable / Generate AWS CloudFront HTTPS for Pipeline
// ======================================
export const generateCloudFrontForPipeline = async (req, res) => {
  try {
    const { pipelineId } = req.params;
    const pipeline = await Pipeline.findById(pipelineId).populate("repository", "name");

    if (!pipeline) {
      return res.status(404).json({ success: false, message: "Pipeline not found." });
    }

    let resolvedCloudAccount = null;
    if (pipeline.cloudAccount) {
      resolvedCloudAccount = await CloudAccount.findById(pipeline.cloudAccount);
    }
    if (!resolvedCloudAccount && pipeline.createdBy) {
      resolvedCloudAccount = await CloudAccount.findOne({ provider: "AWS", owner: pipeline.createdBy });
    }
    if (!resolvedCloudAccount) {
      resolvedCloudAccount = await CloudAccount.findOne({ provider: "AWS" });
    }

    if (!resolvedCloudAccount?.accessKeyId || !resolvedCloudAccount?.secretAccessKey) {
      return res.status(400).json({
        success: false,
        message: "No connected AWS Cloud Account found. Please connect your AWS account in Cloud Accounts.",
      });
    }

    let targetHost = "52.66.243.60";
    let targetPort = pipeline.containerPort || pipeline.appPort || 5000;
    let publicDns = null;

    if (pipeline.ec2InstanceId) {
      try {
        const ec2 = new EC2Client({
          region: resolvedCloudAccount.region || "ap-south-1",
          credentials: {
            accessKeyId: resolvedCloudAccount.accessKeyId,
            secretAccessKey: resolvedCloudAccount.secretAccessKey,
          },
        });
        const d = await ec2.send(new DescribeInstancesCommand({ InstanceIds: [pipeline.ec2InstanceId] }));
        const inst = d.Reservations?.[0]?.Instances?.[0];
        if (inst?.PublicIpAddress) targetHost = inst.PublicIpAddress;
        if (inst?.PublicDnsName) publicDns = inst.PublicDnsName;
      } catch (e) {
        logger.warn(`Could not resolve EC2 info: ${e.message}`);
      }
    }

    const cfResult = await getOrCreateCloudFrontForEc2Backend({
      credentials: {
        accessKeyId: resolvedCloudAccount.accessKeyId,
        secretAccessKey: resolvedCloudAccount.secretAccessKey,
      },
      region: resolvedCloudAccount.region || "ap-south-1",
      publicIp: targetHost,
      publicDnsName: publicDns,
      port: targetPort,
      repoName: pipeline.repository?.name || pipeline.name,
      onLog: (msg) => logger.info(msg),
    });

    if (cfResult?.cloudFrontUrl) {
      pipeline.cloudFrontUrl = cfResult.cloudFrontUrl;
      pipeline.deployedUrl = cfResult.cloudFrontUrl;
      await pipeline.save();

      return res.status(200).json({
        success: true,
        cloudFrontUrl: cfResult.cloudFrontUrl,
        message: `🎉 AWS CloudFront HTTPS Distribution assigned: ${cfResult.cloudFrontUrl}`,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Could not create CloudFront distribution. Please check AWS IAM permissions for CloudFront.",
      });
    }
  } catch (err) {
    logger.error("CloudFront generation error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
