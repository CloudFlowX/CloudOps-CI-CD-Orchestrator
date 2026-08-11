import Pipeline from "../models/pipeline.model.js";
import Repository from "../models/repository.model.js";
import CloudAccount from "../models/cloudAccount.model.js";
import { EC2Client, DescribeInstancesCommand } from "@aws-sdk/client-ec2";
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

    const pipeline = await Pipeline.create({
      name,
      repository,
      branch,
      buildCommand,
      dockerfilePath,
      environment,
      deploymentTarget,
      cloudAccount: cloudAccount || null,
      ec2InstanceId: ec2InstanceId || "",
      appPort: appPort || 3000,
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
    pipeline.cloudAccount = cloudAccount !== undefined ? cloudAccount : pipeline.cloudAccount;
    pipeline.ec2InstanceId = ec2InstanceId !== undefined ? ec2InstanceId : pipeline.ec2InstanceId;
    pipeline.appPort = appPort !== undefined ? appPort : pipeline.appPort;
    pipeline.status = status !== undefined ? status : pipeline.status;

    await pipeline.save();

    const updatedPipeline = await Pipeline.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );

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

    // Update status to running
    pipeline.status = "running";
    await pipeline.save();

    try {
      getIO().emit("pipeline_status_changed", { id: pipeline._id, status: "running" });
    } catch (err) {
      logger.error("Socket error on trigger: " + err.message);
    }

    // Since this is a long-running process, we'll run it asynchronously without blocking the response
    (async () => {
      // Define log streamer callback
      const onLog = (logMessage) => {
        try {
          getIO().emit("pipeline_log", {
            id: pipeline._id,
            log: logMessage.trim()
          });
        } catch (err) {}
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
        
        if (pipeline.deploymentTarget === "docker") {
          const imageName = `${repository.name.toLowerCase().replace(/\s+/g, "-")}:latest`;
          try {
            dockerLogs = await buildDockerImage(projectPath, imageName, pipeline.dockerfilePath, onLog);
          } catch (dockerError) {
            logger.warn("⚠️ Docker build failed (Docker may not be running):", dockerError.message || dockerError);
            dockerLogs = `Docker build skipped: ${dockerError.message || "Docker daemon not available"}`;
            onLog(`[ERROR] Docker build failed: ${dockerError.message || "Daemon not available"}`);
          }
        } else {
           onLog(`[DEPLOY] Starting real SSH deployment to EC2...`);
           
           let publicIp = null;
           // 1. Fetch real EC2 IP
           if (pipeline.cloudAccount && pipeline.ec2InstanceId) {
             try {
               onLog(`[DEPLOY] Fetching EC2 instance details...`);
               const cloudAccount = await CloudAccount.findById(pipeline.cloudAccount);
               if (cloudAccount && cloudAccount.provider === "AWS") {
                 const ec2Client = new EC2Client({
                   region: cloudAccount.region,
                   credentials: {
                     accessKeyId: cloudAccount.accessKeyId,
                     secretAccessKey: cloudAccount.secretAccessKey,
                   },
                 });
                 const data = await ec2Client.send(new DescribeInstancesCommand({ InstanceIds: [pipeline.ec2InstanceId] }));
                 if (data.Reservations?.[0]?.Instances?.[0]?.PublicIpAddress) {
                   publicIp = data.Reservations[0].Instances[0].PublicIpAddress;
                   pipeline.deployedUrl = `http://${publicIp}:${pipeline.appPort || 5003}`;
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
           const sshUsername = process.env.EC2_USERNAME || 'ubuntu';

           if (!sshKeyPath) {
             throw new Error("EC2_SSH_KEY_PATH is not defined in backend .env");
           }

           try {
             await ssh.connect({
               host: publicIp,
               username: sshUsername,
               privateKeyPath: sshKeyPath,
             });
             onLog(`[DEPLOY] SSH Connection established ✓`);

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

             // 4. Install Dependencies
             onLog(`[DEPLOY] Installing dependencies...`);
             await runSSH(`cd ${targetDir} && npm install`);

             // 5. Start Application (using PM2 if available, or fallback to node)
             onLog(`[DEPLOY] Starting application on port ${pipeline.appPort || 5003}...`);
             // Setting PORT env for the app
             const startCmd = `export PORT=${pipeline.appPort || 5003} && (pm2 restart ${repoName} || pm2 start npm --name "${repoName}" -- start || nohup npm start > app.log 2>&1 &)`;
             await runSSH(`cd ${targetDir} && ${startCmd}`);

             onLog(`[DEPLOY] Application is live at ${pipeline.deployedUrl}`);
             onLog(`[DEPLOY] Deployment successful ✓`);
             
           } catch (sshError) {
             onLog(`[ERROR] SSH Deployment Failed: ${sshError.message}`);
             throw sshError;
           } finally {
             ssh.dispose();
           }
        }
        // Update Status
        pipeline.status = "success";
        await pipeline.save();

        try {
          onLog(`[SUCCESS] Pipeline execution finished 🎉`);
          getIO().emit("pipeline_status_changed", { id: pipeline._id, status: "success" });
        } catch (err) {}
      } catch (error) {
        pipeline.status = "failed";
        await pipeline.save();
        try {
          onLog(`[ERROR] Pipeline execution failed: ${error.message || error}`);
          getIO().emit("pipeline_status_changed", { id: pipeline._id, status: "failed" });
        } catch (err) {}
        logger.error("Async pipeline execution failed:", error);
      }
    })();

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
    const { version } = req.body;

    const pipeline = await Pipeline.findById(id);
    if (!pipeline) {
      return res.status(404).json({ success: false, message: "Pipeline not found" });
    }

    // Update version tag in DB
    pipeline.branch = version || "previous-stable"; // Store version as branch for now
    await pipeline.save();

    return res.status(200).json({ success: true, message: `Rolled back to ${version}`, pipeline });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};