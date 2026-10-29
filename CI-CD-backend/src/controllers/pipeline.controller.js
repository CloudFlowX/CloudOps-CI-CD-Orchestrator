import fs from "fs";
import Pipeline from "../models/pipeline.model.js";
import Repository from "../models/repository.model.js";
import CloudAccount from "../models/cloudAccount.model.js";
import { EC2Client, DescribeInstancesCommand, AuthorizeSecurityGroupIngressCommand, StartInstancesCommand } from "@aws-sdk/client-ec2";
import { deployToS3AndCloudFront } from "../services/s3Deploy.service.js";
import { deployToCloudflarePages } from "../services/cloudflareDeploy.service.js";
import {
  ensureDockerfile,
  generateDockerfileContent,
  deployDockerLocal,
  deployDockerRemoteSSH,
  formatDotEnvString,
} from "../services/dockerDeploy.service.js";
import { NodeSSH } from "node-ssh";
import mongoose from "mongoose";
import { getIO } from "../config/socket.js";
import logger from "../config/logger.js";
import {
  cloneRepository,
  buildProject,
  buildDockerImage,
  runContainer,
  stopContainer,
  restartContainer,
  removeContainer,
  getContainerStatus,
  getContainerLogs,
  getK8sPods,
  getK8sDeployments,
  createK8sDeployment,
  scaleK8sDeployment,
  deleteK8sDeployment,
} from "../services/pipeline.service.js";

// ======================================
// Create Pipeline
// ======================================
export const createPipeline = async (req, res) => {
  try {
    const {
      name,
      repository,
      branch,
      buildCommand,
      dockerfilePath,
      environment,
      deploymentTarget,
      cloudAccount,
      ec2InstanceId,
      appPort,
      containerPort,
      envVars,
      s3BucketName,
      cloudflareProjectName,
    } = req.body;

    if (!name || !repository) {
      return res.status(400).json({
        success: false,
        message: "Pipeline name and repository are required.",
      });
    }

    const repo = await Repository.findById(repository);

    if (!repo) {
      return res.status(404).json({
        success: false,
        message: "Repository not found.",
      });
    }

    let resolvedCloudAccount = (cloudAccount && cloudAccount !== "") ? cloudAccount : null;
    if (!resolvedCloudAccount && (deploymentTarget === "aws-s3" || deploymentTarget === "ec2" || deploymentTarget === "docker")) {
      const defaultAws = await CloudAccount.findOne({ provider: "AWS", owner: req.user._id }).sort({ updatedAt: -1 });
      if (defaultAws) resolvedCloudAccount = defaultAws._id;
    }

    const resolvedPort = Number(containerPort) || Number(appPort) || 5000;
    const cleanEnvVars = Array.isArray(envVars)
      ? envVars
          .filter((v) => v && v.key && String(v.key).trim() !== "")
          .map((v) => ({
            key: String(v.key).trim(),
            value: v.value !== undefined ? String(v.value) : "",
            isSecret: !!v.isSecret,
          }))
      : [];

    const pipeline = await Pipeline.create({
      name,
      repository,
      branch,
      buildCommand,
      dockerfilePath,
      environment,
      deploymentTarget: deploymentTarget || "cloudflare",
      cloudAccount: resolvedCloudAccount,
      ec2InstanceId: ec2InstanceId || "",
      appPort: resolvedPort,
      containerPort: resolvedPort,
      envVars: cleanEnvVars,
      s3BucketName: s3BucketName || "",
      cloudflareProjectName: cloudflareProjectName || "",
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Pipeline created successfully.",
      pipeline,
    });
  } catch (error) {
    logger.error("CREATE PIPELINE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// Get All Pipelines
// ======================================
export const getAllPipelines = async (req, res) => {
  try {
    const pipelines = await Pipeline.find()
      .populate("repository", "name githubUrl branch")
      .populate("createdBy", "fullName email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: pipelines.length,
      pipelines,
    });
  } catch (error) {
    logger.error("GET PIPELINES ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// Get Pipeline By ID
// ======================================
export const getPipelineById = async (req, res) => {
  try {
    const { id } = req.params;

    const pipeline = await Pipeline.findById(id)
      .populate("repository", "name githubUrl branch")
      .populate("createdBy", "fullName email role");

    if (!pipeline) {
      return res.status(404).json({
        success: false,
        message: "Pipeline not found.",
      });
    }

    return res.status(200).json({
      success: true,
      pipeline,
    });
  } catch (error) {
    logger.error("GET PIPELINE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// Update Pipeline
// ======================================
export const updatePipeline = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      branch,
      buildCommand,
      dockerfilePath,
      environment,
      deploymentTarget,
      cloudAccount,
      ec2InstanceId,
      appPort,
      containerPort,
      envVars,
      s3BucketName,
      cloudflareProjectName,
      status,
    } = req.body;

    const pipeline = await Pipeline.findById(id);

    if (!pipeline) {
      return res.status(404).json({
        success: false,
        message: "Pipeline not found.",
      });
    }

    pipeline.name = name !== undefined ? name : pipeline.name;
    pipeline.branch = branch !== undefined ? branch : pipeline.branch;
    pipeline.buildCommand = buildCommand !== undefined ? buildCommand : pipeline.buildCommand;
    pipeline.dockerfilePath =
      dockerfilePath !== undefined ? dockerfilePath : pipeline.dockerfilePath;
    pipeline.environment =
      environment !== undefined ? environment : pipeline.environment;
    pipeline.deploymentTarget =
      deploymentTarget !== undefined ? deploymentTarget : pipeline.deploymentTarget;
    if (cloudAccount !== undefined) {
      pipeline.cloudAccount = (cloudAccount && cloudAccount !== "") ? cloudAccount : null;
    }
    pipeline.ec2InstanceId = ec2InstanceId !== undefined ? ec2InstanceId : pipeline.ec2InstanceId;
    if (appPort !== undefined) pipeline.appPort = Number(appPort) || 5000;
    if (containerPort !== undefined) pipeline.containerPort = Number(containerPort) || 5000;
    if (envVars !== undefined && Array.isArray(envVars)) {
      pipeline.envVars = envVars
        .filter((v) => v && v.key && String(v.key).trim() !== "")
        .map((v) => ({
          key: String(v.key).trim(),
          value: v.value !== undefined ? String(v.value) : "",
          isSecret: !!v.isSecret,
        }));
    }
    pipeline.s3BucketName = s3BucketName !== undefined ? s3BucketName : pipeline.s3BucketName;
    pipeline.cloudflareProjectName =
      cloudflareProjectName !== undefined ? cloudflareProjectName : pipeline.cloudflareProjectName;
    pipeline.status = status !== undefined ? status : pipeline.status;

    await pipeline.save();

    const updatedPipeline = pipeline;

    // Emit socket event for real-time updates
    try {
      getIO().emit("pipeline_updated", updatedPipeline);
    } catch (err) {
      logger.error("Socket error on update: " + err.message);
    }

    return res.status(200).json({
      success: true,
      message: "Pipeline updated successfully.",
      pipeline,
    });
  } catch (error) {
    logger.error("UPDATE PIPELINE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// Delete Pipeline
// ======================================
export const deletePipeline = async (req, res) => {
  try {
    const { id } = req.params;

    const pipeline = await Pipeline.findById(id);

    if (!pipeline) {
      return res.status(404).json({
        success: false,
        message: "Pipeline not found.",
      });
    }

    await pipeline.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Pipeline deleted successfully.",
    });
  } catch (error) {
    logger.error("DELETE PIPELINE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// Execute Pipeline Job (Background)
// ======================================
export const executePipelineJob = async (pipelineId) => {
  try {
    const pipeline = await Pipeline.findById(pipelineId);
    if (!pipeline) return;
    
    const repository = await Repository.findById(pipeline.repository);
    if (!repository) return;

    // Accumulate execution logs and auto-persist to database
    const executionLogs = Array.isArray(pipeline.logs) && pipeline.logs.length > 0 
      ? [...pipeline.logs] 
      : [`[INFO] Initializing pipeline runner for ${repository.name}...`];

    let saveTimeout = null;
    const persistLogs = async () => {
      try {
        await Pipeline.findByIdAndUpdate(pipeline._id, { logs: executionLogs });
      } catch (err) {
        logger.warn("Could not auto-save logs:", err.message);
      }
    };

    // Define log streamer callback
    const onLog = (logMessage) => {
      const cleanMsg = typeof logMessage === 'string' ? logMessage.trim() : String(logMessage);
      if (!cleanMsg) return;
      executionLogs.push(cleanMsg);

      try {
        getIO().emit("pipeline_log", {
          id: pipeline._id.toString(),
          log: cleanMsg
        });

        // Also stream live to Centralized Logs Dashboard (/logs)
        const isErr = cleanMsg.includes('[ERROR]') || cleanMsg.includes('ERR!') || cleanMsg.includes('Failed') || cleanMsg.includes('failed');
        const isSuccess = cleanMsg.includes('[SUCCESS]') || cleanMsg.includes('successful') || cleanMsg.includes('✓');
        const isWarn = cleanMsg.includes('[WARN]');
        const level = isErr ? 'ERROR' : (isSuccess ? 'SUCCESS' : (isWarn ? 'WARN' : 'INFO'));

        getIO().emit("system_logs", {
          id: Date.now() + Math.floor(Math.random() * 1000),
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          level: level,
          service: `Pipeline: ${pipeline.name}`,
          message: cleanMsg,
          requestId: `req-${pipeline._id.toString().slice(-6)}`,
          traceId: `trace-${pipeline._id.toString().slice(-6)}`,
          environment: pipeline.environment || "production",
          containerId: pipeline.ec2InstanceId || "ec2-instance"
        });
      } catch (err) {}

      // Debounce saving logs every 1.5 seconds so DB stays updated in real-time
      if (!saveTimeout) {
        saveTimeout = setTimeout(async () => {
          saveTimeout = null;
          await persistLogs();
        }, 1500);
      }
    };

    try {
      onLog(`[INFO] Initializing pipeline runner for ${repository.name}...`);
      
      // Clone GitHub Repository (use pipeline branch, fallback to repo branch)
      const branchToClone = pipeline.branch || repository.branch || "main";
      const projectPath = await cloneRepository(repository.githubUrl, repository.name, branchToClone, onLog);

      // Build Project
      const logs = await buildProject(projectPath, pipeline.buildCommand, onLog);

      // Docker Image Build (optional — skips if Docker is not running or if deployment Target is not docker)
      let dockerLogs = "Docker build skipped (Direct EC2 deployment).";
      
      if (pipeline.deploymentTarget === "cloudflare") {
        onLog(`[DEPLOY] Starting Cloudflare Pages Global Edge Deployment...`);

        let cfToken = (process.env.CLOUDFLARE_API_TOKEN || "").trim().replace(/[\r\n\t\s"']/g, "");
        let cfAccountId = (process.env.CLOUDFLARE_ACCOUNT_ID || "").trim().replace(/[\r\n\t\s"']/g, "");

        // Check if user connected a Cloudflare CloudAccount
        if (pipeline.cloudAccount) {
          try {
            const cloudAccount = await CloudAccount.findById(pipeline.cloudAccount);
            if (cloudAccount && cloudAccount.provider === "Cloudflare") {
              if (cloudAccount.cloudflareApiToken) {
                cfToken = (cloudAccount.cloudflareApiToken || "").trim().replace(/[\r\n\t\s"']/g, "");
              }
              if (cloudAccount.cloudflareAccountId) {
                cfAccountId = (cloudAccount.cloudflareAccountId || "").trim().replace(/[\r\n\t\s"']/g, "");
              }
              onLog(`[DEPLOY] Using connected Cloudflare Account: "${cloudAccount.accountName}"`);
            }
          } catch (accErr) {
            onLog(`[WARN] Could not retrieve selected CloudAccount: ${accErr.message}`);
          }
        }

        const cfResult = await deployToCloudflarePages({
          apiToken: cfToken,
          accountId: cfAccountId,
          projectName: pipeline.cloudflareProjectName || pipeline.name,
          repoName: repository.name,
          projectPath,
          onLog,
        });

        pipeline.deployedUrl = cfResult.deployedUrl;
        pipeline.cloudflareProjectName = cfResult.projectName;
        await pipeline.save();
      } else if (pipeline.deploymentTarget === "aws-s3") {
        onLog(`[DEPLOY] Starting AWS S3 + CloudFront Serverless Deployment (Zero-EC2)...`);

        let s3Credentials = null;
        let s3Region = "us-east-1";

        if (pipeline.cloudAccount) {
          try {
            const cloudAccount = await CloudAccount.findById(pipeline.cloudAccount);
            if (cloudAccount && cloudAccount.provider === "AWS" && cloudAccount.accessKeyId) {
              s3Credentials = {
                accessKeyId: cloudAccount.accessKeyId,
                secretAccessKey: cloudAccount.secretAccessKey,
              };
              s3Region = cloudAccount.region || "us-east-1";
              onLog(`[DEPLOY] Using connected AWS Cloud Account: "${cloudAccount.accountName}" (${s3Region})`);
            }
          } catch (accErr) {
            onLog(`[WARN] Could not retrieve selected CloudAccount: ${accErr.message}`);
          }
        }

        // Auto-fallback: if pipeline has no account or old account was deleted, pick active AWS account
        if (!s3Credentials) {
          try {
            let anyAws = null;
            if (pipeline.createdBy) {
              anyAws = await CloudAccount.findOne({ provider: "AWS", owner: pipeline.createdBy }).sort({ updatedAt: -1 });
            }
            if (!anyAws) {
              anyAws = await CloudAccount.findOne({ provider: "AWS" }).sort({ updatedAt: -1 });
            }

            if (anyAws && anyAws.accessKeyId) {
              s3Credentials = {
                accessKeyId: anyAws.accessKeyId,
                secretAccessKey: anyAws.secretAccessKey,
              };
              s3Region = anyAws.region || "us-east-1";
              pipeline.cloudAccount = anyAws._id;
              await pipeline.save();
              onLog(`[DEPLOY] Auto-selected active AWS Cloud Account: "${anyAws.accountName}" (${s3Region})`);
            }
          } catch (autoErr) {
            onLog(`[WARN] Auto-select AWS account note: ${autoErr.message}`);
          }
        }

        // Fallback to system-level environment credentials if configured
        if (!s3Credentials && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
          s3Credentials = {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          };
          s3Region = process.env.AWS_REGION || "us-east-1";
          onLog(`[DEPLOY] Using platform managed AWS credentials (${s3Region})`);
        }

        if (!s3Credentials) {
          onLog(`[ERROR] AWS Credentials not found.`);
          onLog(`[HINT] 1. Go to 'Cloud Accounts' page -> Ensure your AWS account is connected with Access Key and Secret Key.`);
          onLog(`[HINT] 2. Go to Pipelines -> Edit this pipeline -> select your AWS account in the dropdown.`);
          throw new Error("AWS Credentials not found. Please connect your AWS Cloud Account or select it in pipeline settings.");
        }

        const s3Result = await deployToS3AndCloudFront({
          credentials: s3Credentials,
          region: s3Region,
          bucketName: pipeline.s3BucketName,
          repoName: repository.name,
          projectPath,
          onLog,
        });

        pipeline.deployedUrl = s3Result.deployedUrl;
        pipeline.s3BucketName = s3Result.bucketName;
        if (s3Result.cloudFrontUrl) {
          pipeline.cloudFrontUrl = s3Result.cloudFrontUrl;
        }
        await pipeline.save();
      } else if (pipeline.deploymentTarget === "docker") {
        onLog(`[DEPLOY] Starting Docker Container Deployment for backend application...`);
        const targetPort = pipeline.containerPort || pipeline.appPort || 5000;
        const envVars = pipeline.envVars || [];

        // 1. Ensure Dockerfile exists locally or auto-generate
        const { content: dockerfileContent } = ensureDockerfile(
          projectPath,
          pipeline.dockerfilePath || "./Dockerfile",
          targetPort,
          onLog
        );

        // Check if user has an EC2 instance or AWS account configured to run Docker remotely
        let resolvedCloudAccount = null;
        if (pipeline.cloudAccount) {
          resolvedCloudAccount = await CloudAccount.findById(pipeline.cloudAccount);
        }
        if (!resolvedCloudAccount) {
          if (pipeline.createdBy) {
            resolvedCloudAccount = await CloudAccount.findOne({ provider: "AWS", owner: pipeline.createdBy }).sort({ updatedAt: -1 });
          }
          if (!resolvedCloudAccount) {
            resolvedCloudAccount = await CloudAccount.findOne({ provider: "AWS" }).sort({ updatedAt: -1 });
          }
          if (resolvedCloudAccount && (pipeline.cloudAccount || pipeline.ec2InstanceId)) {
            pipeline.cloudAccount = resolvedCloudAccount._id;
            await pipeline.save();
          }
        }

        const hasEc2Config = !!(pipeline.ec2InstanceId || (resolvedCloudAccount && pipeline.ec2InstanceId));

        if (hasEc2Config) {
          onLog(`[DEPLOY] Target: AWS EC2 Docker Host (Instance: ${pipeline.ec2InstanceId})...`);

          let publicIp = null;
          let ec2Client = null;
          let instanceInfo = null;

          if (resolvedCloudAccount && resolvedCloudAccount.provider === "AWS" && pipeline.ec2InstanceId) {
            try {
              ec2Client = new EC2Client({
                region: resolvedCloudAccount.region || "ap-south-1",
                credentials: {
                  accessKeyId: resolvedCloudAccount.accessKeyId,
                  secretAccessKey: resolvedCloudAccount.secretAccessKey,
                },
              });
              const data = await ec2Client.send(new DescribeInstancesCommand({ InstanceIds: [pipeline.ec2InstanceId] }));
              instanceInfo = data.Reservations?.[0]?.Instances?.[0];

              if (instanceInfo?.State?.Name === "stopped") {
                onLog(`[DEPLOY] EC2 instance is currently STOPPED. Auto-starting instance...`);
                await ec2Client.send(new StartInstancesCommand({ InstanceIds: [pipeline.ec2InstanceId] }));
                for (let poll = 0; poll < 6; poll++) {
                  await new Promise((r) => setTimeout(r, 6000));
                  const pollRes = await ec2Client.send(new DescribeInstancesCommand({ InstanceIds: [pipeline.ec2InstanceId] }));
                  const refreshed = pollRes.Reservations?.[0]?.Instances?.[0];
                  if (refreshed?.PublicIpAddress && refreshed?.State?.Name === "running") {
                    publicIp = refreshed.PublicIpAddress;
                    break;
                  }
                }
              } else if (instanceInfo?.PublicIpAddress) {
                publicIp = instanceInfo.PublicIpAddress;
              }
            } catch (ec2Err) {
              onLog(`[WARN] Could not query EC2: ${ec2Err.message}`);
            }
          }

          if (publicIp && ec2Client && instanceInfo) {
            try {
              const sgId = instanceInfo.SecurityGroups?.[0]?.GroupId;
              if (sgId) {
                onLog(`[DEPLOY] Verifying port ${targetPort} is open in AWS Security Group (${sgId})...`);
                await ec2Client.send(new AuthorizeSecurityGroupIngressCommand({
                  GroupId: sgId,
                  IpPermissions: [{
                    IpProtocol: "tcp", FromPort: targetPort, ToPort: targetPort,
                    IpRanges: [{ CidrIp: "0.0.0.0/0" }]
                  }]
                }));
                onLog(`[DEPLOY] Security Group ingress for port ${targetPort} verified ✓`);
              }
            } catch (sgErr) {
              if (sgErr.name === "InvalidPermission.Duplicate") {
                onLog(`[DEPLOY] Port ${targetPort} is already open in Security Group ✓`);
              } else {
                onLog(`[WARN] Security Group rule check: ${sgErr.message}`);
              }
            }
          }

          // SSH Connection
          const ssh = new NodeSSH();
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

          const targetHost = publicIp || (instanceInfo && instanceInfo.PublicIpAddress);
          if (!targetHost) {
            throw new Error(`Failed to resolve EC2 Public IP for instance "${pipeline.ec2InstanceId}". Cannot connect via SSH.`);
          }

          const usernamesToTry = [process.env.EC2_USERNAME, "ubuntu", "ec2-user", "admin"].filter(Boolean);
          let connected = false;
          let sshUsername = "";

          for (const u of [...new Set(usernamesToTry)]) {
            try {
              onLog(`[DEPLOY] Connecting via SSH to ${targetHost} as "${u}"...`);
              await ssh.connect({
                host: targetHost,
                username: u,
                readyTimeout: 20000,
                ...(rawSshKey ? { privateKey: rawSshKey } : { privateKeyPath: resolvedKeyPath }),
              });
              connected = true;
              sshUsername = u;
              onLog(`[DEPLOY] SSH connection established with ${u} ✓`);
              break;
            } catch (err) {
              onLog(`[DEPLOY] SSH attempt with "${u}" failed: ${err.message}`);
            }
          }

          if (!connected) {
            throw new Error(`Could not connect via SSH to EC2 host ${targetHost}. Please verify SSH Key.`);
          }

          try {
            const repoName = repository.name.replace(/\s+/g, "-");
            const targetDir = `/home/${sshUsername}/${repoName}`;

            onLog(`[DEPLOY] Syncing repository to EC2...`);
            const checkDir = await ssh.execCommand(`[ -d "${targetDir}" ] && echo "exists" || echo "missing"`, { cwd: `/home/${sshUsername}` });
            if (checkDir.stdout.trim() === "exists") {
              await ssh.execCommand(`cd ${targetDir} && git pull`, { cwd: `/home/${sshUsername}` });
            } else {
              await ssh.execCommand(`git clone ${repository.githubUrl} ${repoName}`, { cwd: `/home/${sshUsername}` });
            }

            const remoteResult = await deployDockerRemoteSSH({
              ssh,
              sshUsername,
              repoName,
              targetDir,
              port: targetPort,
              envVars,
              dockerfileContent,
              onLog,
            });

            pipeline.deployedUrl = `http://${targetHost}:${targetPort}`;
            pipeline.containerPort = targetPort;
            pipeline.containerId = remoteResult.containerId;
            await pipeline.save();

            onLog(`[DEPLOY] ====================================================`);
            onLog(`[DEPLOY] 🎉 EC2 DOCKER BACKEND CONTAINER LIVE!`);
            onLog(`[DEPLOY] Public API URL: ${pipeline.deployedUrl}`);
            onLog(`[DEPLOY] ====================================================`);
          } finally {
            ssh.dispose();
          }
        } else {
          // Local Docker Daemon Deployment
          onLog(`[DEPLOY] Target: Local Docker Daemon...`);
          try {
            const localResult = await deployDockerLocal({
              projectPath,
              repoName: repository.name,
              dockerfilePath: pipeline.dockerfilePath,
              port: targetPort,
              envVars,
              onLog,
            });

            pipeline.deployedUrl = localResult.deployedUrl;
            pipeline.containerPort = targetPort;
            pipeline.containerId = localResult.containerId;
            await pipeline.save();
          } catch (localDockerErr) {
            onLog(`[ERROR] Docker deployment failed: ${localDockerErr.message}`);
            onLog(`[HINT] 1. If running locally, make sure Docker Desktop / daemon is started.`);
            onLog(`[HINT] 2. If deploying to cloud, select an AWS Account and EC2 Instance in pipeline settings.`);
            throw localDockerErr;
          }
        }
      } else {
         onLog(`[DEPLOY] Starting real SSH deployment to EC2...`);
         
         let publicIp = null;
         // 1. Fetch real EC2 IP
         let resolvedCloudAccount = null;
         if (pipeline.cloudAccount) {
           resolvedCloudAccount = await CloudAccount.findById(pipeline.cloudAccount);
         }
         if (!resolvedCloudAccount) {
           if (pipeline.createdBy) {
             resolvedCloudAccount = await CloudAccount.findOne({ provider: "AWS", owner: pipeline.createdBy }).sort({ updatedAt: -1 });
           }
           if (!resolvedCloudAccount) {
             resolvedCloudAccount = await CloudAccount.findOne({ provider: "AWS" }).sort({ updatedAt: -1 });
           }
           if (resolvedCloudAccount) {
             pipeline.cloudAccount = resolvedCloudAccount._id;
             await pipeline.save();
             onLog(`[DEPLOY] Auto-selected active AWS Cloud Account: "${resolvedCloudAccount.accountName}"`);
           }
         }

         if (resolvedCloudAccount && pipeline.ec2InstanceId) {
           try {
             onLog(`[DEPLOY] Fetching EC2 instance details...`);
             const cloudAccount = resolvedCloudAccount;
             if (cloudAccount && cloudAccount.provider === "AWS") {
               const ec2Client = new EC2Client({
                 region: cloudAccount.region,
                 credentials: {
                   accessKeyId: cloudAccount.accessKeyId,
                   secretAccessKey: cloudAccount.secretAccessKey,
                 },
               });
               const data = await ec2Client.send(new DescribeInstancesCommand({ InstanceIds: [pipeline.ec2InstanceId] }));
               const instanceInfo = data.Reservations?.[0]?.Instances?.[0];
               
               // Smart Auto-Start: If instance is stopped, automatically power it on!
               if (instanceInfo?.State?.Name === "stopped") {
                 onLog(`[DEPLOY] EC2 instance "${pipeline.ec2InstanceId}" is currently STOPPED. Attempting automatic start...`);
                 try {
                   await ec2Client.send(new StartInstancesCommand({ InstanceIds: [pipeline.ec2InstanceId] }));
                   onLog(`[DEPLOY] Start command sent. Waiting for EC2 instance to become 'running' with a public IP...`);
                   for (let poll = 0; poll < 6; poll++) {
                     await new Promise((r) => setTimeout(r, 6000));
                     const pollRes = await ec2Client.send(new DescribeInstancesCommand({ InstanceIds: [pipeline.ec2InstanceId] }));
                     const refreshed = pollRes.Reservations?.[0]?.Instances?.[0];
                     if (refreshed?.PublicIpAddress && refreshed?.State?.Name === "running") {
                       publicIp = refreshed.PublicIpAddress;
                       onLog(`[DEPLOY] EC2 instance is now RUNNING! Assigned Public IP: ${publicIp}`);
                       break;
                     }
                   }
                 } catch (startErr) {
                   onLog(`[WARN] Could not auto-start EC2 instance: ${startErr.message}`);
                 }
               } else if (instanceInfo?.PublicIpAddress) {
                 publicIp = instanceInfo.PublicIpAddress;
               }

               if (publicIp) {
                 if (instanceInfo?.KeyName) {
                   onLog(`[DEPLOY] EC2 Key Pair registered in AWS: "${instanceInfo.KeyName}"`);
                 }
                 const portToOpen = pipeline.appPort || 5003;
                 pipeline.deployedUrl = `http://${publicIp}:${portToOpen}`;
                 
                 // Automatically open the port in the Security Group!
                 try {
                   const sgId = instanceInfo.SecurityGroups?.[0]?.GroupId;
                   if (sgId) {
                     onLog(`[DEPLOY] Ensuring port ${portToOpen} is open in Security Group...`);
                     await ec2Client.send(new AuthorizeSecurityGroupIngressCommand({
                       GroupId: sgId,
                       IpPermissions: [{
                         IpProtocol: 'tcp', FromPort: portToOpen, ToPort: portToOpen,
                         IpRanges: [{ CidrIp: '0.0.0.0/0' }]
                       }]
                     }));
                     onLog(`[DEPLOY] Port ${portToOpen} is now open to the public.`);
                   }
                 } catch (sgErr) {
                   if (sgErr.name === 'InvalidPermission.Duplicate') {
                      onLog(`[DEPLOY] Port ${portToOpen} is already open.`);
                   } else {
                      onLog(`[WARN] Could not automatically open port ${portToOpen}: ${sgErr.message}`);
                   }
                 }
               }
             }
           } catch (err) {
             onLog(`[ERROR] Could not fetch EC2 Public IP: ${err.message}`);
             logger.warn("Could not fetch EC2 Public IP:", err);
           }
         }

         if (!publicIp) {
           throw new Error("Failed to resolve EC2 Public IP. Cannot connect via SSH.");
         }

         onLog(`[DEPLOY] Resolved IP: ${publicIp}. Connecting via SSH...`);

         // 2. SSH Connection
         const ssh = new NodeSSH();
         const sshKeyPath = process.env.EC2_SSH_KEY_PATH;
         let rawSshKey = process.env.EC2_SSH_KEY;

         // Normalize raw SSH key string (handle quotes, \r\n, \n, escapes)
         if (rawSshKey) {
           rawSshKey = rawSshKey.trim();
           if ((rawSshKey.startsWith('"') && rawSshKey.endsWith('"')) ||
               (rawSshKey.startsWith("'") && rawSshKey.endsWith("'"))) {
             rawSshKey = rawSshKey.slice(1, -1);
           }
           rawSshKey = rawSshKey.replace(/\r\n/g, '\n').replace(/\\n/g, '\n').trim();
         }

         // Support base64-encoded SSH key as alternative
         if (!rawSshKey && process.env.EC2_SSH_KEY_BASE64) {
           try {
             rawSshKey = Buffer.from(process.env.EC2_SSH_KEY_BASE64, 'base64').toString('utf-8').trim();
           } catch (b64Err) {
             logger.warn("Failed to decode EC2_SSH_KEY_BASE64:", b64Err);
           }
         }

         // Check if key file actually exists on filesystem
         let resolvedKeyPath = undefined;
         if (sshKeyPath && fs.existsSync(sshKeyPath)) {
           resolvedKeyPath = sshKeyPath;
         } else if (sshKeyPath) {
           onLog(`[WARN] SSH key file not found at path: ${sshKeyPath}`);
         }

         // If user mistakenly put a file path in EC2_SSH_KEY environment variable
         if (rawSshKey && (rawSshKey.startsWith('/') || rawSshKey.startsWith('./') || rawSshKey.endsWith('.pem'))) {
           if (fs.existsSync(rawSshKey)) {
             resolvedKeyPath = rawSshKey;
             rawSshKey = undefined;
             onLog(`[DEPLOY] EC2_SSH_KEY was set to file path. Using file: ${resolvedKeyPath}`);
           } else {
             onLog(`[WARN] EC2_SSH_KEY appears to be a file path ("${rawSshKey}"), but the file does not exist on this server.`);
             rawSshKey = undefined;
           }
         }

         // Also check fallback secret paths (e.g. Render Secret Files)
         if (!resolvedKeyPath && !rawSshKey) {
           const commonPaths = [
             '/etc/secrets/cloud.pem',
             '/etc/secrets/key.pem',
             '/etc/secrets/id_rsa',
             '/etc/secrets/ec2.pem',
             './cloud.pem',
             './id_rsa'
           ];
           for (const p of commonPaths) {
             if (fs.existsSync(p)) {
               resolvedKeyPath = p;
               onLog(`[DEPLOY] Found SSH key file at: ${p}`);
               break;
             }
           }

           // Auto scan /etc/secrets directory if it exists
           if (!resolvedKeyPath && fs.existsSync('/etc/secrets')) {
             try {
               const secretFiles = fs.readdirSync('/etc/secrets');
               for (const sf of secretFiles) {
                 if (sf.endsWith('.pem') || sf.endsWith('.key') || sf.includes('id_rsa')) {
                   resolvedKeyPath = path.join('/etc/secrets', sf);
                   onLog(`[DEPLOY] Auto-discovered SSH key file in /etc/secrets: ${resolvedKeyPath}`);
                   break;
                 }
               }
             } catch (e) {}
           }
         }

         if (rawSshKey) {
           const hasBegin = rawSshKey.includes('-----BEGIN');
           const hasEnd = rawSshKey.includes('-----END');
           if (!hasBegin || !hasEnd) {
             onLog(`[WARN] EC2_SSH_KEY is set but does not have standard '-----BEGIN ... PRIVATE KEY-----' markers.`);
           } else {
             onLog(`[DEPLOY] Using EC2_SSH_KEY from environment variables (${rawSshKey.length} chars, valid PEM markers ✓)`);
           }
         } else if (resolvedKeyPath) {
           onLog(`[DEPLOY] Using SSH key file from: ${resolvedKeyPath}`);
         }

         if (!rawSshKey && !resolvedKeyPath) {
           const errorMsg = sshKeyPath 
             ? `SSH key file not found at path "${sshKeyPath}". On Render/cloud, either set the 'EC2_SSH_KEY' environment variable with the full .pem content, or add a Secret File in Render and set EC2_SSH_KEY_PATH to its path.`
             : `Neither EC2_SSH_KEY nor EC2_SSH_KEY_PATH is configured. Please provide your EC2 SSH private key.`;
           onLog(`[ERROR] ${errorMsg}`);
           throw new Error(errorMsg);
         }

         const usernamesToTry = [
           process.env.EC2_USERNAME,
           'ubuntu',
           'ec2-user',
           'admin',
           'centos'
         ].filter(Boolean);
         const uniqueUsernames = [...new Set(usernamesToTry)];
         let connected = false;
         let sshUsername = '';

         for (const username of uniqueUsernames) {
           try {
             onLog(`[DEPLOY] Trying SSH with username: ${username}`);
             const sshConfig = {
               host: publicIp,
               username: username,
               readyTimeout: 20000,
             };

             if (rawSshKey) {
               sshConfig.privateKey = rawSshKey;
             } else if (resolvedKeyPath) {
               sshConfig.privateKeyPath = resolvedKeyPath;
             }

             if (process.env.EC2_SSH_PASSPHRASE) {
               sshConfig.passphrase = process.env.EC2_SSH_PASSPHRASE;
             }

             await ssh.connect(sshConfig);
             connected = true;
             sshUsername = username;
             onLog(`[DEPLOY] SSH Connection successful with ${username}! 🚀`);
             break; // Stop trying if connected
           } catch (err) {
             onLog(`[DEPLOY] SSH failed with ${username}. Reason: ${err.message}`);
           }
         }

         if (!connected) {
           onLog(`[ERROR] All configured SSH authentication methods failed for ${publicIp}.`);
           onLog(`[HINT] 1. AWS Key Pair: Verify in AWS EC2 Console that instance "${pipeline.ec2InstanceId || publicIp}" was launched with this exact key.`);
           onLog(`[HINT] 2. Security Group: Inbound rule for Port 22 (SSH) must allow traffic from 0.0.0.0/0.`);
           onLog(`[HINT] 3. Render Setup: In Render Dashboard -> Environment, set EC2_SSH_KEY with your exact .pem key text, or upload it under "Secret Files" as cloud.pem.`);
           throw new Error(`All configured SSH authentication methods failed. Key pair on instance ${publicIp} does not match the provided SSH key.`);
         }

         try {
           // Helper for running SSH commands
           const runSSH = async (cmd) => {
             onLog(`[EC2] $ ${cmd}`);
             const result = await ssh.execCommand(cmd, { cwd: `/home/${sshUsername}` });
             if (result.stdout) onLog(result.stdout);
             if (result.stderr) onLog(result.stderr);
             return result;
           };

           const repoName = repository.name.replace(/\s+/g, '-');
           const targetDir = `/home/${sshUsername}/${repoName}`;

           // 3. Clone or Pull
           onLog(`[DEPLOY] Syncing repository...`);
           const checkDir = await ssh.execCommand(`[ -d "${targetDir}" ] && echo "exists" || echo "missing"`, { cwd: `/home/${sshUsername}` });
           
           if (checkDir.stdout.trim() === 'exists') {
             await runSSH(`cd ${targetDir} && git pull`);
           } else {
             await runSSH(`git clone ${repository.githubUrl} ${repoName}`);
           }

           // 3.5 Ensure Node.js is installed
           onLog(`[DEPLOY] Checking if Node.js & NPM are installed on target...`);
           const installNodeCmd = `if ! command -v npm &> /dev/null; then curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt-get install -y nodejs; fi`;
           await runSSH(installNodeCmd);

           // 4. Check App Type & Install Dependencies
           onLog(`[DEPLOY] Checking repository type...`);
           const checkPkgCmd = `[ -f "${targetDir}/package.json" ] && echo "node" || echo "static"`;
           const repoTypeRes = await ssh.execCommand(checkPkgCmd, { cwd: `/home/${sshUsername}` });
           const repoType = repoTypeRes.stdout.trim();

           if (repoType === "node") {
             onLog(`[DEPLOY] Node.js project detected. Installing dependencies...`);
             await runSSH(`cd ${targetDir} && npm install`);
             
             // 5. Start Application
             onLog(`[DEPLOY] Starting Node.js application on port ${pipeline.appPort || 5003}...`);
             const startCmd = `export PORT=${pipeline.appPort || 5003} && (npx -y pm2 restart ${repoName} || npx -y pm2 start npm --name "${repoName}" -- start || nohup npm start > app.log 2>&1 &)`;
             await runSSH(`cd ${targetDir} && ${startCmd}`);
           } else {
             onLog(`[DEPLOY] Static website detected (No package.json).`);
             onLog(`[DEPLOY] Starting static web server on port ${pipeline.appPort || 5003}...`);
             // Use npx serve or pm2 serve for static sites in the background
             const startCmd = `(npx -y pm2 restart ${repoName}-static || npx -y pm2 serve . ${pipeline.appPort || 5003} --spa --name "${repoName}-static" || nohup npx -y serve -s . -p ${pipeline.appPort || 5003} > app.log 2>&1 &)`;
             await runSSH(`cd ${targetDir} && ${startCmd}`);
           }

           onLog(`[DEPLOY] Application is live at ${pipeline.deployedUrl}`);
           onLog(`[DEPLOY] Deployment successful ✓`);
           
         } catch (sshError) {
           onLog(`[ERROR] SSH Deployment Failed: ${sshError.message}`);
           throw sshError;
         } finally {
           ssh.dispose();
         }
      }
      if (saveTimeout) clearTimeout(saveTimeout);
      onLog(`[SUCCESS] Pipeline execution finished 🎉`);

      // Update Status & persist full execution logs
      pipeline.status = "success";
      pipeline.logs = executionLogs;
      await pipeline.save();

      try {
        getIO().emit("pipeline_status_changed", { id: pipeline._id, status: "success" });
      } catch (err) {}
    } catch (error) {
      if (saveTimeout) clearTimeout(saveTimeout);
      onLog(`[ERROR] Pipeline execution failed: ${error.message || error}`);

      pipeline.status = "failed";
      pipeline.logs = executionLogs;
      await pipeline.save();

      try {
        getIO().emit("pipeline_status_changed", { id: pipeline._id, status: "failed" });
        
        // Trigger system alert for pipeline failure
        try {
          const { triggerAlert } = await import("../utils/alertHelper.js");
          await triggerAlert({
            title: `Pipeline Execution Failed: ${pipeline.name}`,
            service: pipeline.name,
            message: `Deployment failed during execution phase. Error: ${error.message || error}`,
            severity: "Critical",
            metric: "Deployment",
            threshold: "Success",
            currentValue: "Failed"
          });
        } catch(e) { console.error("Alert trigger failed", e) }
        
      } catch (err) {}
      logger.error("Async pipeline execution failed:", error);
    }
  } catch (err) {
    logger.error("Failed to execute pipeline job:", err);
  }
};

// ======================================
// Trigger Pipeline
// ======================================
export const triggerPipeline = async (req, res) => {
  try {
    const { id } = req.params;

    // Find Pipeline
    const pipeline = await Pipeline.findById(id);

    if (!pipeline) {
      return res.status(404).json({
        success: false,
        message: "Pipeline not found.",
      });
    }

    // Find Repository
    const repository = await Repository.findById(
      pipeline.repository
    );

    if (!repository) {
      return res.status(404).json({
        success: false,
        message: "Repository not found.",
      });
    }

    // Update status to running and initialize fresh log array
    pipeline.status = "running";
    pipeline.logs = [`[INFO] Pipeline execution triggered manually...`];
    await pipeline.save();

    try {
      getIO().emit("pipeline_status_changed", { id: pipeline._id, status: "running" });
    } catch (err) {
      logger.error("Socket error on trigger: " + err.message);
    }

    // Since this is a long-running process, we'll run it asynchronously without blocking the response
    executePipelineJob(pipeline._id);

    return res.status(200).json({
      success: true,
      message: "Pipeline execution triggered successfully.",
    });
  } catch (error) {
    const errorMsg = error?.message || String(error);
    logger.error("========== TRIGGER PIPELINE ERROR ==========");
    logger.error("Pipeline ID:", req.params.id);
    logger.error("Error Message:", errorMsg);
    logger.error("Full Error:", error);
    logger.error("=============================================");

    // Mark pipeline as failed if it was found
    try {
      const failedPipeline = await Pipeline.findById(
        req.params.id
      );
      if (failedPipeline && failedPipeline.status === "running") {
        failedPipeline.status = "failed";
        await failedPipeline.save();
      }
    } catch (saveError) {
      logger.error("FAILED TO UPDATE PIPELINE STATUS:", saveError);
    }

    return res.status(500).json({
      success: false,
      message: `Pipeline trigger failed: ${errorMsg}`,
      error: errorMsg,
    });
  }
};

// ======================================
// Run Container
// ======================================
export const runPipelineContainer = async (req, res) => {
  try {
    const { id } = req.params;
    const { port, envVars } = req.body;

    // Find Pipeline
    const pipeline = await Pipeline.findById(id);

    if (!pipeline) {
      return res.status(404).json({
        success: false,
        message: "Pipeline not found.",
      });
    }

    // Check if container already running
    if (pipeline.containerId) {
      return res.status(400).json({
        success: false,
        message: `Container already running: ${pipeline.containerId.substring(0, 12)}. Stop or remove it first.`,
      });
    }

    // Find Repository for image name
    const repository = await Repository.findById(
      pipeline.repository
    );

    if (!repository) {
      return res.status(404).json({
        success: false,
        message: "Repository not found.",
      });
    }

    const imageName = `${repository.name.toLowerCase().replace(/\s+/g, "-")}:latest`;
    const containerName = `${repository.name.toLowerCase().replace(/\s+/g, "-")}-container`;
    const hostPort = port || 3000;
    const portMapping = `${hostPort}:${hostPort}`;

    // Run Container
    const containerId = await runContainer(
      imageName,
      containerName,
      portMapping,
      envVars || {}
    );

    // Save Container ID and Port
    pipeline.containerId = containerId;
    pipeline.containerPort = hostPort;
    await pipeline.save();

    return res.status(200).json({
      success: true,
      message: "Container started successfully.",
      containerId: containerId.substring(0, 12),
      containerName,
      port: hostPort,
      imageName,
    });
  } catch (error) {
    logger.error("RUN CONTAINER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// Stop Container
// ======================================
export const stopPipelineContainer = async (req, res) => {
  try {
    const { id } = req.params;

    const pipeline = await Pipeline.findById(id);

    if (!pipeline) {
      return res.status(404).json({
        success: false,
        message: "Pipeline not found.",
      });
    }

    if (!pipeline.containerId) {
      return res.status(400).json({
        success: false,
        message: "No running container found for this pipeline.",
      });
    }

    const logs = await stopContainer(pipeline.containerId);

    return res.status(200).json({
      success: true,
      message: "Container stopped successfully.",
      containerId: pipeline.containerId.substring(0, 12),
      logs,
    });
  } catch (error) {
    logger.error("STOP CONTAINER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// Restart Container
// ======================================
export const restartPipelineContainer = async (req, res) => {
  try {
    const { id } = req.params;

    const pipeline = await Pipeline.findById(id);

    if (!pipeline) {
      return res.status(404).json({
        success: false,
        message: "Pipeline not found.",
      });
    }

    if (!pipeline.containerId) {
      return res.status(400).json({
        success: false,
        message: "No container found for this pipeline.",
      });
    }

    const logs = await restartContainer(pipeline.containerId);

    return res.status(200).json({
      success: true,
      message: "Container restarted successfully.",
      containerId: pipeline.containerId.substring(0, 12),
      logs,
    });
  } catch (error) {
    logger.error("RESTART CONTAINER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// Remove Container
// ======================================
export const removePipelineContainer = async (req, res) => {
  try {
    const { id } = req.params;

    const pipeline = await Pipeline.findById(id);

    if (!pipeline) {
      return res.status(404).json({
        success: false,
        message: "Pipeline not found.",
      });
    }

    if (!pipeline.containerId) {
      return res.status(400).json({
        success: false,
        message: "No container found for this pipeline.",
      });
    }

    const logs = await removeContainer(pipeline.containerId);

    // Clear container data from DB
    pipeline.containerId = "";
    pipeline.containerPort = null;
    await pipeline.save();

    return res.status(200).json({
      success: true,
      message: "Container removed successfully.",
      logs,
    });
  } catch (error) {
    logger.error("REMOVE CONTAINER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// Get Container Status
// ======================================
export const getPipelineContainerStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const pipeline = await Pipeline.findById(id);

    if (!pipeline) {
      return res.status(404).json({
        success: false,
        message: "Pipeline not found.",
      });
    }

    if (!pipeline.containerId) {
      return res.status(400).json({
        success: false,
        message: "No container found for this pipeline.",
      });
    }

    const status = await getContainerStatus(
      pipeline.containerId
    );

    return res.status(200).json({
      success: true,
      containerId: pipeline.containerId.substring(0, 12),
      containerPort: pipeline.containerPort,
      status,
    });
  } catch (error) {
    logger.error("CONTAINER STATUS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// Get Container Logs
// ======================================
export const getPipelineContainerLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const tail = parseInt(req.query.tail) || 100;

    const pipeline = await Pipeline.findById(id);

    if (!pipeline) {
      return res.status(404).json({
        success: false,
        message: "Pipeline not found.",
      });
    }

    if (!pipeline.containerId) {
      return res.status(400).json({
        success: false,
        message: "No container found for this pipeline.",
      });
    }

    const logs = await getContainerLogs(
      pipeline.containerId,
      tail
    );

    return res.status(200).json({
      success: true,
      containerId: pipeline.containerId.substring(0, 12),
      tail,
      logs,
    });
  } catch (error) {
    logger.error("CONTAINER LOGS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// K8s: Get Pods
// ======================================
export const getK8sPodsController = async (req, res) => {
  try {
    const namespace = req.query.namespace || "default";

    const pods = await getK8sPods(namespace);

    return res.status(200).json({
      success: true,
      namespace,
      count: pods.length,
      pods,
    });
  } catch (error) {
    logger.error("K8S GET PODS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// K8s: Get Deployments
// ======================================
export const getK8sDeploymentsController = async (
  req,
  res
) => {
  try {
    const namespace = req.query.namespace || "default";

    const deployments = await getK8sDeployments(namespace);

    return res.status(200).json({
      success: true,
      namespace,
      count: deployments.length,
      deployments,
    });
  } catch (error) {
    logger.error("K8S GET DEPLOYMENTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// K8s: Deploy
// ======================================
export const deployToK8s = async (req, res) => {
  try {
    const { id } = req.params;
    const { replicas, port, namespace } = req.body;

    // Find Pipeline
    const pipeline = await Pipeline.findById(id);

    if (!pipeline) {
      return res.status(404).json({
        success: false,
        message: "Pipeline not found.",
      });
    }

    // Find Repository for image name
    const repository = await Repository.findById(
      pipeline.repository
    );

    if (!repository) {
      return res.status(404).json({
        success: false,
        message: "Repository not found.",
      });
    }

    const imageName = `${repository.name.toLowerCase().replace(/\s+/g, "-")}:latest`;
    const deploymentName = `${repository.name.toLowerCase().replace(/\s+/g, "-")}-deployment`;
    const containerPort = port || 3000;
    const ns = namespace || "default";

    const result = await createK8sDeployment(
      deploymentName,
      imageName,
      replicas || 1,
      containerPort,
      ns
    );

    return res.status(201).json({
      success: true,
      message: "Kubernetes deployment created successfully.",
      deployment: result,
    });
  } catch (error) {
    logger.error("K8S DEPLOY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// K8s: Scale Deployment
// ======================================
export const scaleK8sDeploymentController = async (
  req,
  res
) => {
  try {
    const { id } = req.params;
    const { replicas, deploymentName, namespace } = req.body;

    if (replicas === undefined || replicas === null) {
      return res.status(400).json({
        success: false,
        message: "replicas field is required.",
      });
    }

    // Find Pipeline
    const pipeline = await Pipeline.findById(id);

    if (!pipeline) {
      return res.status(404).json({
        success: false,
        message: "Pipeline not found.",
      });
    }

    // Get deployment name from body or derive from repo
    let depName = deploymentName;

    if (!depName) {
      const repository = await Repository.findById(
        pipeline.repository
      );

      if (!repository) {
        return res.status(404).json({
          success: false,
          message: "Repository not found.",
        });
      }

      depName = `${repository.name.toLowerCase().replace(/\s+/g, "-")}-deployment`;
    }

    const ns = namespace || "default";

    const logs = await scaleK8sDeployment(
      depName,
      replicas,
      ns
    );

    return res.status(200).json({
      success: true,
      message: `Deployment scaled to ${replicas} replicas.`,
      deploymentName: depName,
      replicas,
      namespace: ns,
      logs,
    });
  } catch (error) {
    logger.error("K8S SCALE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// K8s: Delete Deployment
// ======================================
export const deleteK8sDeploymentController = async (
  req,
  res
) => {
  try {
    const { name } = req.params;
    const namespace = req.query.namespace || "default";

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Deployment name is required.",
      });
    }

    const logs = await deleteK8sDeployment(name, namespace);

    return res.status(200).json({
      success: true,
      message: `Deployment '${name}' deleted successfully.`,
      logs,
    });
  } catch (error) {
    logger.error("K8S DELETE DEPLOYMENT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// GitHub Actions Webhook
// ======================================
export const githubActionsWebhook = async (req, res) => {
  try {
    // GitHub sends workflow_run events
    const event = req.headers["x-github-event"];
    
    if (event === "ping") {
      return res.status(200).json({ success: true, message: "Pong" });
    }

    if (event === "workflow_run") {
      const { workflow_run, repository } = req.body;
      const status = workflow_run.status; // 'queued', 'in_progress', 'completed'
      const conclusion = workflow_run.conclusion; // 'success', 'failure', etc.

      // Map github status to our pipeline status
      let mappedStatus = "pending";
      if (status === "in_progress" || status === "queued") mappedStatus = "running";
      if (status === "completed") {
        mappedStatus = conclusion === "success" ? "success" : "failed";
      }

      // Find the repository in our DB based on githubUrl or name
      const repoName = repository.name;
      
      const dbRepo = await Repository.findOne({ name: repoName });
      if (!dbRepo) {
        return res.status(404).json({ success: false, message: "Repository not tracked" });
      }

      // Update the pipeline for this repo
      // Ideally, GitHub Action would send pipelineId in client_payload, but for simplicity, we find the latest pipeline
      const pipeline = await Pipeline.findOne({ repository: dbRepo._id }).sort({ createdAt: -1 });

      if (pipeline) {
        pipeline.status = mappedStatus;
        await pipeline.save();
        
        try {
          getIO().emit("pipeline_status_changed", { id: pipeline._id, status: mappedStatus });
        } catch (err) {}
      }

      return res.status(200).json({ success: true, message: "Status updated" });
    }

    return res.status(200).json({ success: true, message: "Ignored" });
  } catch (error) {
    logger.error("WEBHOOK ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ======================================
// Scale Pipeline
// ======================================
export const scalePipeline = async (req, res) => {
  try {
    const { id } = req.params;
    const { replicas } = req.body;

    const pipeline = await Pipeline.findById(id);
    if (!pipeline) {
      return res.status(404).json({ success: false, message: "Pipeline not found" });
    }

    // In a real K8s setup, this would call K8s API. For local mock we just update DB.
    // Assuming we can add a 'replicas' field dynamically if it doesn't exist.
    pipeline.set('replicasTotal', parseInt(replicas));
    await pipeline.save();

    return res.status(200).json({ success: true, message: `Scaled to ${replicas}`, pipeline });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ======================================
// Rollback Pipeline
// ======================================
export const rollbackPipeline = async (req, res) => {
  try {
    const { id } = req.params;
    const { version } = req.body; // Expecting a git commit hash or branch name

    const pipeline = await Pipeline.findById(id);
    if (!pipeline) {
      return res.status(404).json({ success: false, message: "Pipeline not found" });
    }

    if (!version) {
       return res.status(400).json({ success: false, message: "Version (commit/branch) is required for rollback" });
    }

    // Set the branch to the previous version (commit hash or branch)
    pipeline.branch = version;
    pipeline.status = "pending";
    await pipeline.save();

    // Trigger the pipeline execution with the old version
    executePipelineJob(pipeline._id).catch(err => {
      logger.error(`Rollback execution failed for pipeline ${id}:`, err);
    });

    return res.status(200).json({ success: true, message: `Rollback initiated for version/commit: ${version}`, pipeline });
  } catch (error) {
    logger.error("ROLLBACK ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ======================================
// Get Pipeline Logs
// ======================================
export const getPipelineLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const pipeline = await Pipeline.findById(id).select("logs status name");
    if (!pipeline) {
      return res.status(404).json({ success: false, message: "Pipeline not found." });
    }
    return res.status(200).json({
      success: true,
      logs: pipeline.logs || [],
    });
  } catch (error) {
    logger.error("GET PIPELINE LOGS ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};