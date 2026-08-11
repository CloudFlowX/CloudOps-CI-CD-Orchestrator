import logger from "../config/logger.js";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import { EC2Client, DescribeInstancesCommand, DescribeVpcsCommand } from "@aws-sdk/client-ec2";
import { ProjectsClient } from "@google-cloud/resource-manager";
import { ClientSecretCredential } from "@azure/identity";
import { ResourceManagementClient } from "@azure/arm-resources";
import CloudAccount from "../models/cloudAccount.model.js";

// ======================================
// Verify and Connect AWS Account
// ======================================
export const connectCloudAccount = async (req, res) => {
  try {
    const { 
      provider, 
      accountName, 
      environment,
      // AWS
      accessKeyId, 
      secretAccessKey, 
      region,
      // GCP
      gcpProjectId,
      gcpClientEmail,
      gcpPrivateKey,
      // Azure
      azureTenantId,
      azureClientId,
      azureClientSecret,
      azureSubscriptionId
    } = req.body;

    if (!accountName || !provider) {
      return res.status(400).json({ success: false, message: "Account Name and Provider are required." });
    }

    // --- AWS VALIDATION ---
    if (provider === "AWS") {
      if (!accessKeyId || !secretAccessKey || !region) {
        return res.status(400).json({ success: false, message: "Missing required AWS credentials." });
      }

      const stsClient = new STSClient({
        region,
        credentials: { accessKeyId, secretAccessKey },
      });

      try {
        await stsClient.send(new GetCallerIdentityCommand({}));
      } catch (error) {
        return res.status(401).json({ success: false, message: "Invalid AWS Credentials.", error: error.message });
      }
    } 
    // --- GCP VALIDATION ---
    else if (provider === "GCP") {
      if (!gcpProjectId || !gcpClientEmail || !gcpPrivateKey) {
        return res.status(400).json({ success: false, message: "Missing required GCP credentials." });
      }

      try {
        // Format private key correctly if passed from JSON
        const formattedKey = gcpPrivateKey.replace(/\\n/g, '\n');
        
        const client = new ProjectsClient({
          credentials: {
            client_email: gcpClientEmail,
            private_key: formattedKey,
          },
          projectId: gcpProjectId,
        });

        // Test credentials by getting the project
        await client.getProject({ name: `projects/${gcpProjectId}` });
      } catch (error) {
        return res.status(401).json({ success: false, message: "Invalid GCP Credentials or insufficient permissions.", error: error.message });
      }
    }
    // --- AZURE VALIDATION ---
    else if (provider === "Azure") {
      if (!azureTenantId || !azureClientId || !azureClientSecret || !azureSubscriptionId) {
        return res.status(400).json({ success: false, message: "Missing required Azure credentials." });
      }

      try {
        const credential = new ClientSecretCredential(azureTenantId, azureClientId, azureClientSecret);
        const client = new ResourceManagementClient(credential, azureSubscriptionId);
        
        // Test credentials by listing resource groups (a lightweight call)
        await client.resourceGroups.list().next();
      } catch (error) {
        return res.status(401).json({ success: false, message: "Invalid Azure Credentials or insufficient permissions.", error: error.message });
      }
    } else {
      return res.status(400).json({ success: false, message: "Unsupported cloud provider." });
    }

    // Check if account name already exists for this user
    const existingAccount = await CloudAccount.findOne({ accountName, owner: req.user._id });
    if (existingAccount) {
      return res.status(409).json({ success: false, message: "A cloud account with this name already exists." });
    }

    // Save to Database
    const accountData = {
      provider,
      accountName,
      environment: environment || "Development",
      owner: req.user._id,
      status: "connected",
    };

    if (provider === "AWS") {
      accountData.accessKeyId = accessKeyId;
      accountData.secretAccessKey = secretAccessKey;
      accountData.region = region;
    } else if (provider === "GCP") {
      accountData.gcpProjectId = gcpProjectId;
      accountData.gcpClientEmail = gcpClientEmail;
      accountData.gcpPrivateKey = gcpPrivateKey.replace(/\\n/g, '\n');
    } else if (provider === "Azure") {
      accountData.azureTenantId = azureTenantId;
      accountData.azureClientId = azureClientId;
      accountData.azureClientSecret = azureClientSecret;
      accountData.azureSubscriptionId = azureSubscriptionId;
    }

    const cloudAccount = await CloudAccount.create(accountData);

    return res.status(201).json({
      success: true,
      message: `${provider} Account connected successfully.`,
      account: {
        id: cloudAccount._id,
        accountName: cloudAccount.accountName,
        provider: cloudAccount.provider,
        environment: cloudAccount.environment,
        status: cloudAccount.status,
      },
    });
  } catch (error) {
    logger.error("CONNECT CLOUD ACCOUNT ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ======================================
// Get All Cloud Accounts
// ======================================
export const getCloudAccounts = async (req, res) => {
  try {
    const accounts = await CloudAccount.find({ owner: req.user._id })
      .populate("owner", "fullName email")
      .sort({ createdAt: -1 });

    const maskedAccounts = accounts.map((acc) => {
      const data = {
        id: acc._id,
        provider: acc.provider,
        accountName: acc.accountName,
        environment: acc.environment,
        status: acc.status,
        createdAt: acc.createdAt,
        owner: acc.owner, // Included populated owner details
      };

      if (acc.provider === "AWS") {
        data.accessKeyId = acc.accessKeyId ? acc.accessKeyId.substring(0, 4) + "****" + acc.accessKeyId.substring(acc.accessKeyId.length - 4) : "****";
        data.region = acc.region;
      } else if (acc.provider === "GCP") {
        data.gcpProjectId = acc.gcpProjectId;
        data.gcpClientEmail = acc.gcpClientEmail;
      } else if (acc.provider === "Azure") {
        data.azureSubscriptionId = acc.azureSubscriptionId;
        data.azureTenantId = acc.azureTenantId;
      }

      return data;
    });

    return res.status(200).json({ success: true, count: maskedAccounts.length, accounts: maskedAccounts });
  } catch (error) {
    logger.error("GET CLOUD ACCOUNTS ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ======================================
// Update Cloud Account
// ======================================
export const updateCloudAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { accountName, region, environment, status } = req.body;

    const account = await CloudAccount.findOne({ _id: id, owner: req.user._id });

    if (!account) return res.status(404).json({ success: false, message: "Cloud account not found." });

    if (accountName) account.accountName = accountName;
    if (region && account.provider === "AWS") account.region = region;
    if (environment) account.environment = environment;
    if (status) account.status = status;

    await account.save();

    return res.status(200).json({
      success: true,
      message: "Cloud account updated successfully.",
    });
  } catch (error) {
    logger.error("UPDATE CLOUD ACCOUNT ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ======================================
// Delete Cloud Account
// ======================================
export const deleteCloudAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const account = await CloudAccount.findOne({ _id: id, owner: req.user._id });

    if (!account) return res.status(404).json({ success: false, message: "Cloud account not found." });

    await account.deleteOne();

    return res.status(200).json({ success: true, message: "Cloud account deleted successfully." });
  } catch (error) {
    logger.error("DELETE CLOUD ACCOUNT ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ======================================
// Fetch AWS Resources for Testing
// ======================================
export const getAwsResources = async (req, res) => {
  try {
    const { id } = req.params;

    // Find account and ensure ownership
    const account = await CloudAccount.findOne({ _id: id, owner: req.user._id });

    if (!account) {
      return res.status(404).json({ success: false, message: "Cloud account not found." });
    }

    if (account.provider !== "AWS") {
      return res.status(400).json({ success: false, message: "Requested account is not an AWS account." });
    }

    // Initialize EC2 Client using decrypted credentials
    const ec2Client = new EC2Client({
      region: account.region,
      credentials: {
        accessKeyId: account.accessKeyId,
        secretAccessKey: account.secretAccessKey,
      },
    });

    // Fetch EC2 Instances
    const instancesData = await ec2Client.send(new DescribeInstancesCommand({}));
    const instances = [];
    instancesData.Reservations?.forEach(reservation => {
      reservation.Instances?.forEach(instance => {
        // Extract Name from Tags
        const nameTag = instance.Tags?.find(tag => tag.Key === "Name");
        instances.push({
          id: instance.InstanceId,
          name: nameTag ? nameTag.Value : "Unnamed Instance",
          state: instance.State?.Name,
          type: instance.InstanceType,
          publicIp: instance.PublicIpAddress || "None",
        });
      });
    });

    // Fetch VPCs
    const vpcsData = await ec2Client.send(new DescribeVpcsCommand({}));
    const vpcs = vpcsData.Vpcs?.map(vpc => {
      const nameTag = vpc.Tags?.find(tag => tag.Key === "Name");
      return {
        id: vpc.VpcId,
        name: nameTag ? nameTag.Value : "Unnamed VPC",
        cidr: vpc.CidrBlock,
        state: vpc.State,
      };
    }) || [];

    return res.status(200).json({
      success: true,
      resources: {
        instances,
        vpcs
      }
    });

  } catch (error) {
    logger.error("GET AWS RESOURCES ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
