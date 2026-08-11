import simpleGit from "simple-git";
import fs from "fs";
import path from "path";
import os from "os";
import { runCommand } from "../utils/command.util.js";

const git = simpleGit();

// ==============================
// Clone Repository
// ==============================
export const cloneRepository = async (
  githubUrl,
  repoName,
  branch = "main",
  onLog
) => {
  try {
    // Workspace outside current project
    const workspace = path.join(os.homedir(), "cloud-workspace");

    // Create workspace if not exists
    if (!fs.existsSync(workspace)) {
      fs.mkdirSync(workspace, { recursive: true });
    }

    // Repository path
    const projectPath = path.join(workspace, repoName);

    // Check if repository already exists
    if (fs.existsSync(projectPath)) {
      if (onLog) onLog(`[INFO] Repository exists. Pulling latest changes (branch: ${branch})...\n`);
      console.log(`🔄 Pulling latest changes for ${projectPath} (branch: ${branch})`);
      
      const repoGit = simpleGit(projectPath);
      await repoGit.checkout(branch);
      await repoGit.pull('origin', branch);
      
      if (onLog) onLog(`[INFO] Git pull completed. (Using cached node_modules for speed! ⚡)\n`);
    } else {
      if (onLog) onLog(`[INFO] Cloning repository ${githubUrl} into ${projectPath} (branch: ${branch})...\n`);
      console.log(
        `📥 Cloning repository into ${projectPath} (branch: ${branch})`
      );

      // Clone with specific branch
      await git.clone(githubUrl, projectPath, [
        "--branch",
        branch,
        "--single-branch",
      ]);
      if (onLog) onLog(`[INFO] Clone completed.\n`);
    }

    // ============================
    // Post-Clone Verification
    // ============================
    if (!fs.existsSync(projectPath)) {
      throw new Error(
        `Clone failed: directory was not created at ${projectPath}`
      );
    }

    const files = fs.readdirSync(projectPath);
    // Filter out hidden files like .git to check actual content
    const visibleFiles = files.filter((f) => !f.startsWith("."));

    if (visibleFiles.length === 0) {
      throw new Error(
        `Clone failed: repository is empty or contains no visible files. Check if the GitHub URL is correct and accessible: ${githubUrl}`
      );
    }

    console.log(
      `✅ Repository cloned successfully (${files.length} items)`
    );

    return projectPath;
  } catch (error) {
    console.error("CLONE REPOSITORY ERROR:", error);
    throw error;
  }
};

// ==============================
// Build Project
// ==============================
export const buildProject = async (
  projectPath,
  buildCommand,
  onLog
) => {
  try {
    // Check package.json
    const packageJsonPath = path.join(
      projectPath,
      "package.json"
    );

    if (!fs.existsSync(packageJsonPath)) {
      return {
        installLogs: "package.json not found.",
        buildLogs: "Build skipped.",
      };
    }

    // ============================
    // Parse package.json upfront
    // ============================
    const packageJson = JSON.parse(
      fs.readFileSync(packageJsonPath, "utf-8")
    );
    const availableScripts = packageJson.scripts || {};

    console.log(
      `📋 Available scripts: [${Object.keys(availableScripts).join(", ") || "none"}]`
    );

    // ============================
    // Install Dependencies
    // ============================
    if (onLog) onLog(`[BUILD] Installing dependencies (npm install)...\n`);
    console.log("📦 Installing dependencies...");

    const installLogs = await runCommand(
      "npm install",
      projectPath,
      onLog
    );
    if (onLog) onLog(`[BUILD] Dependencies installed ✓\n`);

    // ============================
    // Determine Build Command
    // ============================
    let effectiveCommand = "";

    if (buildCommand && buildCommand.trim() !== "") {
      effectiveCommand = buildCommand.trim();
    } else if (availableScripts.build) {
      effectiveCommand = "npm run build";
      console.log(
        `🔍 Auto-detected "build" script: "${availableScripts.build}"`
      );
    }

    // ============================
    // Validate & Execute
    // ============================
    if (!effectiveCommand) {
      console.log(
        "⚠️ No buildCommand provided and no 'build' script in package.json. Build skipped."
      );
      return { installLogs, buildLogs: "Build skipped." };
    }

    // Check if command references npm scripts that don't exist
    const scriptRefs = [
      ...effectiveCommand.matchAll(/npm run (\S+)/g),
    ];
    const missingScripts = scriptRefs
      .map((match) => match[1])
      .filter((script) => !availableScripts[script]);

    if (missingScripts.length > 0) {
      console.log(
        `⚠️ Skipping build: missing npm script(s) [${missingScripts.join(", ")}]. Available: [${Object.keys(availableScripts).join(", ") || "none"}]`
      );
      return {
        installLogs,
        buildLogs: `Build skipped. Missing scripts: ${missingScripts.join(", ")}`,
      };
    }

    if (onLog) onLog(`[BUILD] Running build command: ${effectiveCommand}...\n`);
    console.log(`🏗️ Running: ${effectiveCommand}`);

    const buildLogs = await runCommand(
      effectiveCommand,
      projectPath,
      onLog
    );
    if (onLog) onLog(`[BUILD] Build completed ✓\n`);

    return { installLogs, buildLogs };
  } catch (error) {
    console.error("BUILD PROJECT ERROR:", error);
    throw error;
  }
};

// ==============================
// Build Docker Image
// ==============================
export const buildDockerImage = async (
  projectPath,
  imageName,
  dockerfilePath = "./Dockerfile",
  onLog
) => {
  try {
    // ============================
    // Verify Dockerfile exists
    // ============================
    const fullDockerfilePath = path.resolve(
      projectPath,
      dockerfilePath
    );

    if (!fs.existsSync(fullDockerfilePath)) {
      console.log(
        `⚠️ Dockerfile not found at ${fullDockerfilePath}. Docker build skipped.`
      );
      return "Docker build skipped. Dockerfile not found.";
    }

    console.log(`🐳 Building Docker image: ${imageName}`);
    console.log(`📄 Using Dockerfile: ${dockerfilePath}`);

    // ============================
    // Build Docker Image
    // ============================
    if (onLog) onLog(`[DOCKER] Building Docker image: ${imageName}...\n`);
    const dockerLogs = await runCommand(
      `docker build -t ${imageName} -f ${dockerfilePath} .`,
      projectPath,
      onLog
    );
    if (onLog) onLog(`[DOCKER] Docker image built successfully ✓\n`);

    console.log(`✅ Docker image built successfully: ${imageName}`);

    return dockerLogs;
  } catch (error) {
    console.error("DOCKER BUILD ERROR:", error);
    throw error;
  }
};

// ==============================
// Run Docker Container
// ==============================
export const runContainer = async (
  imageName,
  containerName,
  portMapping,
  envVars = {}
) => {
  try {
    console.log(`🚀 Starting container: ${containerName}`);

    // Build environment variable flags
    const envFlags = Object.entries(envVars)
      .map(([key, value]) => `-e ${key}=${value}`)
      .join(" ");

    // Build docker run command
    const command = [
      "docker run -d",
      `--name ${containerName}`,
      `-p ${portMapping}`,
      envFlags,
      imageName,
    ]
      .filter(Boolean)
      .join(" ");

    console.log(`📋 Command: ${command}`);

    const output = await runCommand(command);

    // Container ID is the output (trimmed)
    const containerId = output.trim();

    console.log(
      `✅ Container started: ${containerName} (${containerId.substring(0, 12)})`
    );

    return containerId;
  } catch (error) {
    console.error("DOCKER RUN ERROR:", error);
    throw error;
  }
};

// ==============================
// Stop Docker Container
// ==============================
export const stopContainer = async (containerId) => {
  try {
    console.log(
      `⏹️ Stopping container: ${containerId.substring(0, 12)}`
    );

    const logs = await runCommand(
      `docker stop ${containerId}`
    );

    console.log(`✅ Container stopped: ${containerId.substring(0, 12)}`);

    return logs;
  } catch (error) {
    console.error("DOCKER STOP ERROR:", error);
    throw error;
  }
};

// ==============================
// Restart Docker Container
// ==============================
export const restartContainer = async (containerId) => {
  try {
    console.log(
      `🔄 Restarting container: ${containerId.substring(0, 12)}`
    );

    const logs = await runCommand(
      `docker restart ${containerId}`
    );

    console.log(
      `✅ Container restarted: ${containerId.substring(0, 12)}`
    );

    return logs;
  } catch (error) {
    console.error("DOCKER RESTART ERROR:", error);
    throw error;
  }
};

// ==============================
// Remove Docker Container
// ==============================
export const removeContainer = async (containerId) => {
  try {
    console.log(
      `🗑️ Removing container: ${containerId.substring(0, 12)}`
    );

    // Force remove (stops if running)
    const logs = await runCommand(
      `docker rm -f ${containerId}`
    );

    console.log(
      `✅ Container removed: ${containerId.substring(0, 12)}`
    );

    return logs;
  } catch (error) {
    console.error("DOCKER REMOVE ERROR:", error);
    throw error;
  }
};

// ==============================
// Get Container Status
// ==============================
export const getContainerStatus = async (containerId) => {
  try {
    console.log(
      `📊 Getting status for container: ${containerId.substring(0, 12)}`
    );

    const output = await runCommand(
      `docker inspect --format '{"status":"{{.State.Status}}","running":{{.State.Running}},"startedAt":"{{.State.StartedAt}}","finishedAt":"{{.State.FinishedAt}}","exitCode":{{.State.ExitCode}},"image":"{{.Config.Image}}","name":"{{.Name}}"}' ${containerId}`
    );

    const status = JSON.parse(output.trim());

    // Get port mappings separately
    const portOutput = await runCommand(
      `docker port ${containerId}`
    ).catch(() => "No ports mapped");

    status.ports = portOutput.trim();

    console.log(
      `✅ Container status: ${status.status}`
    );

    return status;
  } catch (error) {
    console.error("DOCKER STATUS ERROR:", error);
    throw error;
  }
};

// ==============================
// Get Container Logs
// ==============================
export const getContainerLogs = async (
  containerId,
  tail = 100
) => {
  try {
    console.log(
      `📜 Fetching logs for container: ${containerId.substring(0, 12)}`
    );

    const logs = await runCommand(
      `docker logs --tail ${tail} ${containerId}`
    );

    console.log(`✅ Logs fetched (last ${tail} lines)`);

    return logs;
  } catch (error) {
    console.error("DOCKER LOGS ERROR:", error);
    throw error;
  }
};

// ==============================
// K8s: Get Pods
// ==============================
export const getK8sPods = async (namespace = "default") => {
  try {
    console.log(
      `☸️ Fetching pods in namespace: ${namespace}`
    );

    const output = await runCommand(
      `kubectl get pods -n ${namespace} -o json`
    );

    const data = JSON.parse(output);

    const pods = data.items.map((pod) => ({
      name: pod.metadata.name,
      namespace: pod.metadata.namespace,
      status: pod.status.phase,
      restarts:
        pod.status.containerStatuses?.[0]?.restartCount || 0,
      image:
        pod.spec.containers?.[0]?.image || "unknown",
      createdAt: pod.metadata.creationTimestamp,
    }));

    console.log(`✅ Found ${pods.length} pods`);

    return pods;
  } catch (error) {
    console.error("K8S GET PODS ERROR:", error);
    throw error;
  }
};

// ==============================
// K8s: Get Deployments
// ==============================
export const getK8sDeployments = async (
  namespace = "default"
) => {
  try {
    console.log(
      `☸️ Fetching deployments in namespace: ${namespace}`
    );

    const output = await runCommand(
      `kubectl get deployments -n ${namespace} -o json`
    );

    const data = JSON.parse(output);

    const deployments = data.items.map((dep) => ({
      name: dep.metadata.name,
      namespace: dep.metadata.namespace,
      replicas: dep.spec.replicas,
      readyReplicas: dep.status.readyReplicas || 0,
      availableReplicas:
        dep.status.availableReplicas || 0,
      image:
        dep.spec.template.spec.containers?.[0]?.image ||
        "unknown",
      createdAt: dep.metadata.creationTimestamp,
    }));

    console.log(
      `✅ Found ${deployments.length} deployments`
    );

    return deployments;
  } catch (error) {
    console.error("K8S GET DEPLOYMENTS ERROR:", error);
    throw error;
  }
};

// ==============================
// K8s: Create Deployment
// ==============================
export const createK8sDeployment = async (
  deploymentName,
  imageName,
  replicas = 1,
  containerPort = 3000,
  namespace = "default"
) => {
  try {
    console.log(
      `☸️ Creating deployment: ${deploymentName} (image: ${imageName}, replicas: ${replicas})`
    );

    // Generate deployment YAML
    const manifest = `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${deploymentName}
  namespace: ${namespace}
  labels:
    app: ${deploymentName}
spec:
  replicas: ${replicas}
  selector:
    matchLabels:
      app: ${deploymentName}
  template:
    metadata:
      labels:
        app: ${deploymentName}
    spec:
      containers:
        - name: ${deploymentName}
          image: ${imageName}
          imagePullPolicy: Never
          ports:
            - containerPort: ${containerPort}
---
apiVersion: v1
kind: Service
metadata:
  name: ${deploymentName}-svc
  namespace: ${namespace}
spec:
  selector:
    app: ${deploymentName}
  ports:
    - protocol: TCP
      port: ${containerPort}
      targetPort: ${containerPort}
  type: ClusterIP
`;

    // Write manifest to temp file
    const workspace = path.join(
      os.homedir(),
      "cloud-workspace"
    );

    if (!fs.existsSync(workspace)) {
      fs.mkdirSync(workspace, { recursive: true });
    }

    const manifestPath = path.join(
      workspace,
      `${deploymentName}-manifest.yaml`
    );

    fs.writeFileSync(manifestPath, manifest);

    console.log(`📄 Manifest written to: ${manifestPath}`);

    // Apply manifest
    const logs = await runCommand(
      `kubectl apply -f ${manifestPath}`
    );

    console.log(
      `✅ Deployment created: ${deploymentName}`
    );

    return {
      deploymentName,
      imageName,
      replicas,
      containerPort,
      namespace,
      manifestPath,
      logs: logs.trim(),
    };
  } catch (error) {
    console.error("K8S CREATE DEPLOYMENT ERROR:", error);
    throw error;
  }
};

// ==============================
// K8s: Scale Deployment
// ==============================
export const scaleK8sDeployment = async (
  deploymentName,
  replicas,
  namespace = "default"
) => {
  try {
    console.log(
      `☸️ Scaling ${deploymentName} to ${replicas} replicas`
    );

    const logs = await runCommand(
      `kubectl scale deployment ${deploymentName} --replicas=${replicas} -n ${namespace}`
    );

    console.log(
      `✅ Scaled ${deploymentName} to ${replicas} replicas`
    );

    return logs.trim();
  } catch (error) {
    console.error("K8S SCALE ERROR:", error);
    throw error;
  }
};

// ==============================
// K8s: Delete Deployment
// ==============================
export const deleteK8sDeployment = async (
  deploymentName,
  namespace = "default"
) => {
  try {
    console.log(
      `☸️ Deleting deployment: ${deploymentName}`
    );

    // Delete deployment
    const depLogs = await runCommand(
      `kubectl delete deployment ${deploymentName} -n ${namespace}`
    );

    // Delete associated service
    const svcLogs = await runCommand(
      `kubectl delete service ${deploymentName}-svc -n ${namespace}`
    ).catch(() => "Service not found or already deleted.");

    console.log(
      `✅ Deployment deleted: ${deploymentName}`
    );

    return {
      deploymentLogs: depLogs.trim(),
      serviceLogs:
        typeof svcLogs === "string"
          ? svcLogs.trim()
          : svcLogs,
    };
  } catch (error) {
    console.error("K8S DELETE DEPLOYMENT ERROR:", error);
    throw error;
  }
};