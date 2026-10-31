import fs from "fs";
import path from "path";
import { NodeSSH } from "node-ssh";
import { EC2Client, DescribeInstancesCommand } from "@aws-sdk/client-ec2";
import logger from "../config/logger.js";
import Environment from "../models/environment.model.js";
import EnvVar from "../models/envVar.model.js";
import Pipeline from "../models/pipeline.model.js";
import CloudAccount from "../models/cloudAccount.model.js";
import AuditLog from "../models/auditLog.model.js";
import { restartDockerRemoteSSH } from "../services/dockerDeploy.service.js";

// ======================================
// Get All Environments
// ======================================
export const getEnvironments = async (req, res) => {
  try {
    const environments = await Environment.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: environments.length,
      environments,
    });
  } catch (error) {
    logger.error("GET ENVIRONMENTS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// Create Environment
// ======================================
export const createEnvironment = async (req, res) => {
  try {
    const { name, provider, region, clusterName } = req.body;

    if (!name || !region) {
      return res.status(400).json({
        success: false,
        message: "Environment name and region are required.",
      });
    }

    const environment = await Environment.create({
      name,
      provider: provider || "AWS",
      region,
      clusterName: clusterName || "",
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Environment created successfully.",
      environment,
    });
  } catch (error) {
    logger.error("CREATE ENVIRONMENT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// Get Env Vars
// ======================================
export const getEnvVars = async (req, res) => {
  try {
    const envVars = await EnvVar.find().populate("environment", "name");

    return res.status(200).json({
      success: true,
      count: envVars.length,
      envVars,
    });
  } catch (error) {
    logger.error("GET ENV VARS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// Create Env Var
// ======================================
export const createEnvVar = async (req, res) => {
  try {
    const { environmentId, key, value, scope, masked } = req.body;

    if (!environmentId || !key || !value) {
      return res.status(400).json({
        success: false,
        message: "Environment, key, and value are required.",
      });
    }

    const envVar = await EnvVar.create({
      environment: environmentId,
      key,
      value,
      scope: scope || "Local",
      masked: masked || false,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Environment variable created successfully.",
      envVar,
    });
  } catch (error) {
    logger.error("CREATE ENV VAR ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// Get Pipeline Environment Variables
// ======================================
export const getPipelineVariables = async (req, res) => {
  try {
    const { pipelineId } = req.query;
    let query = {};
    if (pipelineId) {
      query._id = pipelineId;
    }

    const pipelines = await Pipeline.find(query)
      .populate("repository", "name githubUrl")
      .populate("createdBy", "name email role")
      .select("name environment deploymentTarget deployedUrl customDomain domainStatus domainDnsRecord containerPort ec2InstanceId envVars createdBy updatedAt")
      .sort({ updatedAt: -1 });

    const isAdmin = req.user.role === "admin";

    const mappedPipelines = pipelines.map((p) => {
      const pObj = p.toObject();
      const isOwner = p.createdBy && p.createdBy._id && p.createdBy._id.toString() === req.user._id.toString();

      if (!isAdmin && !isOwner && Array.isArray(pObj.envVars)) {
        pObj.envVars = pObj.envVars.map((v) =>
          v.isSecret ? { ...v, value: "••••••••••••", masked: true } : { ...v, masked: false }
        );
      }
      return pObj;
    });

    return res.status(200).json({
      success: true,
      count: mappedPipelines.length,
      pipelines: mappedPipelines,
    });
  } catch (error) {
    logger.error("GET PIPELINE VARIABLES ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// Save Pipeline Environment Variables
// ======================================
export const savePipelineVariables = async (req, res) => {
  try {
    const { pipelineId } = req.params;
    const { envVars } = req.body;

    if (!Array.isArray(envVars)) {
      return res.status(400).json({
        success: false,
        message: "envVars must be an array of variables.",
      });
    }

    const pipeline = await Pipeline.findById(pipelineId);
    if (!pipeline) {
      return res.status(404).json({
        success: false,
        message: "Pipeline not found.",
      });
    }

    const isAdmin = req.user.role === "admin";
    const isOwner = pipeline.createdBy && pipeline.createdBy.toString() === req.user._id.toString();
    if (!isAdmin && !isOwner && pipeline.visibility === "admin_only") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only admins or pipeline owners can update variables.",
      });
    }

    // Clean and validate variables
    const cleanVars = envVars
      .filter((v) => v && v.key && String(v.key).trim())
      .map((v) => ({
        key: String(v.key).trim().toUpperCase(),
        value: v.value !== undefined ? String(v.value) : "",
        isSecret: !!v.isSecret,
      }));

    pipeline.envVars = cleanVars;
    await pipeline.save();

    // Create Audit Log
    try {
      await AuditLog.create({
        user: req.user._id,
        action: "UPDATE_ENV_VARS",
        resourceType: "Pipeline",
        resourceId: pipeline._id,
        details: `Updated ${cleanVars.length} environment variables for pipeline "${pipeline.name}"`,
      });
    } catch (e) {}

    return res.status(200).json({
      success: true,
      message: "Environment variables saved successfully.",
      pipelineId: pipeline._id,
      envVars: cleanVars,
    });
  } catch (error) {
    logger.error("SAVE PIPELINE VARIABLES ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// Sync & Fast Restart Container
// ======================================
export const syncAndRestartPipeline = async (req, res) => {
  try {
    const { pipelineId } = req.params;
    const pipeline = await Pipeline.findById(pipelineId).populate("repository");

    if (!pipeline) {
      return res.status(404).json({ success: false, message: "Pipeline not found." });
    }

    if (pipeline.deploymentTarget !== "docker") {
      return res.status(400).json({
        success: false,
        message: `Fast restart is only applicable to Docker containers. For "${pipeline.deploymentTarget}", please trigger a full pipeline deployment.`,
      });
    }

    const repoName = pipeline.repository?.name || pipeline.name;
    const cleanRepo = repoName.replace(/\s+/g, "-");
    const containerName = `cloudops-${cleanRepo.toLowerCase().replace(/[^a-z0-9-]/g, "-")}`;
    const targetPort = pipeline.containerPort || pipeline.appPort || 5000;
    const envVars = pipeline.envVars || [];

    // Check if deploying to EC2
    let resolvedCloudAccount = null;
    if (pipeline.cloudAccount) {
      resolvedCloudAccount = await CloudAccount.findById(pipeline.cloudAccount);
    }
    if (!resolvedCloudAccount && pipeline.createdBy) {
      resolvedCloudAccount = await CloudAccount.findOne({ provider: "AWS", owner: pipeline.createdBy }).sort({ updatedAt: -1 });
    }
    if (!resolvedCloudAccount) {
      resolvedCloudAccount = await CloudAccount.findOne({ provider: "AWS" }).sort({ updatedAt: -1 });
    }

    if (pipeline.ec2InstanceId || (resolvedCloudAccount && pipeline.ec2InstanceId)) {
      // Connect to EC2
      let publicIp = null;
      let instanceInfo = null;

      if (resolvedCloudAccount?.accessKeyId && resolvedCloudAccount?.secretAccessKey) {
        try {
          const ec2Client = new EC2Client({
            region: resolvedCloudAccount.region || "ap-south-1",
            credentials: {
              accessKeyId: resolvedCloudAccount.accessKeyId,
              secretAccessKey: resolvedCloudAccount.secretAccessKey,
            },
          });
          const data = await ec2Client.send(new DescribeInstancesCommand({ InstanceIds: [pipeline.ec2InstanceId] }));
          instanceInfo = data.Reservations?.[0]?.Instances?.[0];
          publicIp = instanceInfo?.PublicIpAddress;
        } catch (e) {
          logger.warn(`Could not query EC2 describe: ${e.message}`);
        }
      }

      // SSH Key
      let rawSshKey = process.env.EC2_SSH_KEY;
      const sshKeyPath = process.env.EC2_SSH_KEY_PATH;
      if (rawSshKey) {
        rawSshKey = rawSshKey.trim();
        if ((rawSshKey.startsWith('"') && rawSshKey.endsWith('"')) || (rawSshKey.startsWith("'") && rawSshKey.endsWith("'"))) {
          rawSshKey = rawSshKey.slice(1, -1);
        }
        rawSshKey = rawSshKey.replace(/\r\n/g, "\n").replace(/\\n/g, "\n").trim();
      }
      let resolvedKeyPath = (sshKeyPath && fs.existsSync(sshKeyPath)) ? sshKeyPath : undefined;
      if (!resolvedKeyPath && !rawSshKey) {
        const commonPaths = ["/etc/secrets/cloud.pem", "/etc/secrets/key.pem", "/etc/secrets/id_rsa", "./cloud.pem", "./id_rsa"];
        for (const p of commonPaths) {
          if (fs.existsSync(p)) { resolvedKeyPath = p; break; }
        }
      }

      let targetHost = publicIp;
      if (!targetHost && pipeline.deployedUrl) {
        try {
          const parsedUrl = new URL(pipeline.deployedUrl);
          targetHost = parsedUrl.hostname;
        } catch (e) {}
      }

      if (!targetHost) {
        return res.status(400).json({ success: false, message: "Could not resolve EC2 host IP." });
      }

      const ssh = new NodeSSH();
      const usernamesToTry = [process.env.EC2_USERNAME, "ubuntu", "ec2-user", "admin"].filter(Boolean);
      let connected = false;
      let sshUsername = "";

      for (const u of [...new Set(usernamesToTry)]) {
        try {
          await ssh.connect({
            host: targetHost,
            username: u,
            readyTimeout: 15000,
            ...(rawSshKey ? { privateKey: rawSshKey } : { privateKeyPath: resolvedKeyPath }),
          });
          connected = true;
          sshUsername = u;
          break;
        } catch (err) {}
      }

      if (!connected) {
        return res.status(500).json({ success: false, message: `Could not connect to EC2 host ${targetHost} via SSH.` });
      }

      try {
        const targetDir = `/home/${sshUsername}/${cleanRepo}`;
        const restartResult = await restartDockerRemoteSSH({
          ssh,
          targetDir,
          containerName,
          port: targetPort,
          envVars,
          onLog: (msg) => logger.info(`[FAST-RESTART] ${msg}`),
        });

        return res.status(200).json({
          success: restartResult.success,
          message: restartResult.success
            ? `⚡ Environment variables synced and container restarted in ~2s! (Status: ${restartResult.psStatus}) ✓`
            : `Container restarted, but status is: ${restartResult.psStatus}. Check logs if it crashed.`,
          containerStatus: restartResult.psStatus,
        });
      } finally {
        ssh.dispose();
      }
    } else {
      // Local Docker Daemon
      return res.status(200).json({
        success: true,
        message: "Environment variables saved. Please trigger pipeline deployment to restart local daemon container.",
      });
    }
  } catch (error) {
    logger.error("SYNC & RESTART ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
