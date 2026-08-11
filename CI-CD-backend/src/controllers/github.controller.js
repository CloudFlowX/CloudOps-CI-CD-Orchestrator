import logger from "../config/logger.js";
import axios from "axios";
import User from "../models/user.model.js";
import Pipeline from "../models/pipeline.model.js";
import Repository from "../models/repository.model.js";
import { executePipelineJob } from "./pipeline.controller.js";

export const getGitHubActionsRuns = async (req, res) => {
  try {
    const token = process.env.GITHUB_TOKEN;
    const defaultRepo = process.env.GITHUB_DEFAULT_REPO || "kunalkumar563/Cloud-Orchestrator-Updated";

    if (!token) {
      // Fallback to mock if no token configured
      logger.warn("GITHUB_TOKEN not found in env, using mock data for GitHub runs");
      return res.status(200).json({
        success: true,
        runs: getMockRuns()
      });
    }

    // Call real GitHub API
    const response = await axios.get(
      `https://api.github.com/repos/${defaultRepo}/actions/runs`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json"
        },
        params: {
          per_page: 10
        }
      }
    );

    res.status(200).json({
      success: true,
      runs: response.data.workflow_runs
    });
  } catch (error) {
    logger.error("GitHub API Error:", error.response?.data || error.message);
    // Fallback on failure
    res.status(200).json({
      success: true,
      runs: getMockRuns(),
      error: error.message
    });
  }
};

export const triggerGitHubAction = async (req, res) => {
  try {
    const { repo, workflow_id, ref } = req.body;
    const token = process.env.GITHUB_TOKEN;

    if (!token) {
      logger.warn("GITHUB_TOKEN not found in env, mocking trigger");
      return res.status(200).json({
        success: true,
        message: `Workflow ${workflow_id} triggered successfully on ${repo} (${ref}) [MOCKED]`
      });
    }

    await axios.post(
      `https://api.github.com/repos/${repo}/actions/workflows/${workflow_id}/dispatches`,
      { ref },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json"
        }
      }
    );

    res.status(200).json({
      success: true,
      message: `Workflow ${workflow_id} triggered successfully on ${repo} (${ref})`
    });
  } catch (error) {
    logger.error("GitHub Trigger Error:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: error.response?.data?.message || error.message || "Failed to trigger GitHub Action"
    });
  }
};

function getMockRuns() {
  return [
    {
      id: 1001,
      name: "CI/CD Pipeline",
      head_branch: "main",
      status: "completed",
      conclusion: "success",
      event: "push",
      created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
      actor: { login: "kunal24" },
      repository: { name: "cloud-orchestrator", full_name: "kunal24/cloud-orchestrator" }
    },
    {
      id: 1002,
      name: "Security Scan",
      head_branch: "develop",
      status: "completed",
      conclusion: "failure",
      event: "pull_request",
      created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
      actor: { login: "dependabot" },
      repository: { name: "ecommerce-api", full_name: "ecommerce/ecommerce-api" }
    },
    {
      id: 1003,
      name: "Deploy to EKS",
      head_branch: "release/v2",
      status: "in_progress",
      conclusion: null,
      event: "workflow_dispatch",
      created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      actor: { login: "admin" },
      repository: { name: "frontend-web", full_name: "ecommerce/frontend-web" }
    }
  ];
}

// ======================================
// GitHub OAuth and Repositories Integration
// ======================================

// Generate GitHub OAuth URL
export const getAuthUrl = (req, res) => {
  const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

  if (!GITHUB_CLIENT_ID) {
    return res.status(500).json({ success: false, message: "Please configure GITHUB_CLIENT_ID in your backend .env file and RESTART the server." });
  }
  const redirectUri = `${FRONTEND_URL}/repositories`;
  const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${redirectUri}&scope=repo,user&prompt=consent`;
  return res.status(200).json({ success: true, url });
};

// Exchange code for access token
export const connectGithub = async (req, res) => {
  try {
    const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
    const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
    
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: "Authorization code is required" });
    }

    // Exchange code
    const tokenResponse = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      },
      { headers: { Accept: "application/json" } }
    );

    const accessToken = tokenResponse.data.access_token;
    if (!accessToken) {
      return res.status(400).json({ success: false, message: "Failed to obtain GitHub access token" });
    }

    // Fetch user details
    const userResponse = await axios.get("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const githubUsername = userResponse.data.login;

    // Update User
    await User.findByIdAndUpdate(req.user._id, {
      githubAccessToken: accessToken,
      githubUsername,
    });

    return res.status(200).json({ success: true, message: "GitHub connected successfully", githubUsername });
  } catch (error) {
    logger.error("CONNECT GITHUB ERROR:", error.response?.data || error);
    return res.status(500).json({ success: false, message: "Failed to connect to GitHub" });
  }
};

// Disconnect GitHub
export const disconnectGithub = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      githubAccessToken: null,
      githubUsername: null,
    });
    return res.status(200).json({ success: true, message: "GitHub disconnected successfully" });
  } catch (error) {
    logger.error("DISCONNECT GITHUB ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to disconnect GitHub" });
  }
};

// ======================================
// GitHub Webhook Listener
// ======================================
export const handleWebhook = async (req, res) => {
  try {
    const event = req.headers["x-github-event"];
    logger.info(`Received GitHub Webhook Event: ${event}`);

    // Immediately respond to GitHub to prevent timeouts
    res.status(200).json({ received: true });

    // Only process push events
    if (event !== "push") return;

    const payload = req.body;
    const repositoryName = payload.repository?.full_name; // e.g. "kunalkumar563/cloud-orchestrator"
    let branch = payload.ref; // e.g. "refs/heads/main"

    if (!repositoryName || !branch) {
      logger.warn("Webhook payload missing repository name or branch ref.");
      return;
    }

    // Clean up branch name ("refs/heads/main" -> "main")
    branch = branch.replace("refs/heads/", "");

    logger.info(`Webhook details - Repo: ${repositoryName}, Branch: ${branch}`);

    // Find our database Repository by matching the name
    // Since users enter URLs like https://github.com/owner/repo.git, we use regex to match the end of the URL
    const repos = await Repository.find({ 
      $or: [
        { githubUrl: { $regex: new RegExp(`${repositoryName}(\\.git)?$`, 'i') } },
        { name: { $regex: new RegExp(repositoryName.split('/').pop(), 'i') } }
      ]
    });

    if (repos.length === 0) {
      logger.info(`No tracked repository matches: ${repositoryName}`);
      return;
    }

    const repoIds = repos.map(r => r._id);

    // Find all Pipelines linked to these repositories that should track this branch
    const pipelines = await Pipeline.find({
      repository: { $in: repoIds },
      $or: [
        { branch: branch },
        { branch: { $exists: false } },
        { branch: "" }
      ]
    });

    if (pipelines.length === 0) {
      logger.info(`No pipelines configured for ${repositoryName} on branch ${branch}`);
      return;
    }

    logger.info(`Found ${pipelines.length} pipelines to auto-trigger for ${repositoryName} (${branch})`);

    // Trigger execution for each matching pipeline asynchronously
    for (const pipeline of pipelines) {
      logger.info(`Auto-triggering Pipeline ID: ${pipeline._id}`);
      
      // Update status to running before calling execute
      pipeline.status = "running";
      await pipeline.save();

      // Trigger socket event
      try {
        const { getIO } = await import("../config/socket.js");
        getIO().emit("pipeline_status_changed", { id: pipeline._id, status: "running" });
      } catch (e) {}

      // Fire and forget
      executePipelineJob(pipeline._id).catch(err => {
        logger.error(`Webhook Auto-Deploy failed for Pipeline ${pipeline._id}:`, err);
      });
    }

  } catch (error) {
    logger.error("Error processing GitHub Webhook:", error);
    // Don't send 500 because we already sent 200 at the beginning
  }
};

// Fetch User's GitHub Repositories
export const getRepositories = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user.githubAccessToken) {
      return res.status(401).json({ success: false, message: "GitHub is not connected" });
    }

    // Fetch repos (limit to 100 for now, could add pagination)
    const reposResponse = await axios.get("https://api.github.com/user/repos?per_page=100&sort=updated", {
      headers: { Authorization: `Bearer ${user.githubAccessToken}` },
    });

    const repos = reposResponse.data.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      private: repo.private,
      url: repo.html_url,
      language: repo.language,
      defaultBranch: repo.default_branch,
    }));

    return res.status(200).json({ success: true, repositories: repos });
  } catch (error) {
    logger.error("GET GITHUB REPOS ERROR:", error.response?.data || error);
    return res.status(500).json({ success: false, message: "Failed to fetch repositories from GitHub" });
  }
};

// Fetch Branches for a Repository
export const getBranches = async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const user = await User.findById(req.user._id);
    if (!user.githubAccessToken) {
      return res.status(401).json({ success: false, message: "GitHub is not connected" });
    }

    const branchesResponse = await axios.get(`https://api.github.com/repos/${owner}/${repo}/branches`, {
      headers: { Authorization: `Bearer ${user.githubAccessToken}` },
    });

    const branches = branchesResponse.data.map((b) => b.name);

    return res.status(200).json({ success: true, branches });
  } catch (error) {
    logger.error("GET GITHUB BRANCHES ERROR:", error.response?.data || error);
    return res.status(500).json({ success: false, message: "Failed to fetch branches from GitHub" });
  }
};

