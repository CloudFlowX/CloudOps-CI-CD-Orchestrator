import {
  CloudFrontClient,
  CreateDistributionCommand,
  ListDistributionsCommand,
  CreateInvalidationCommand,
} from "@aws-sdk/client-cloudfront";
import logger from "../config/logger.js";

/**
 * Configure or reuse AWS CloudFront HTTPS Distribution for an EC2 Docker Backend API
 * Eliminates raw IP and port (e.g. :5000), providing a clean https://*.cloudfront.net URL.
 */
export const getOrCreateCloudFrontForEc2Backend = async ({
  credentials,
  region = "ap-south-1",
  publicIp,
  publicDnsName,
  port = 5000,
  repoName = "backend",
  onLog = console.log,
}) => {
  if (!credentials?.accessKeyId || !credentials?.secretAccessKey) {
    if (onLog) onLog(`[CLOUDFRONT] AWS Credentials not provided. Retaining direct EC2 URL.`);
    return null;
  }

  if (!publicIp) {
    if (onLog) onLog(`[CLOUDFRONT] Public IP missing. Retaining direct EC2 URL.`);
    return null;
  }

  // CloudFront requires a DNS hostname for custom origins (not raw IPv4)
  const originDomain =
    publicDnsName && publicDnsName.length > 5
      ? publicDnsName
      : `ec2-${publicIp.replace(/\./g, "-")}.${region}.compute.amazonaws.com`;

  const originId = `EC2Backend-${repoName.replace(/[^a-zA-Z0-9-_]/g, "")}-${port}`;
  const originPort = Number(port) || 5000;

  const cloudFrontClient = new CloudFrontClient({
    region: "us-east-1", // CloudFront control plane is in us-east-1
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
    },
  });

  try {
    if (onLog) onLog(`[CLOUDFRONT] Checking for existing CloudFront distribution for ${originDomain}:${originPort}...`);

    // 1. Check if a distribution already exists for this origin
    const listRes = await cloudFrontClient.send(new ListDistributionsCommand({ MaxItems: 50 }));
    const existing = listRes.DistributionList?.Items?.find((d) =>
      d.Origins?.Items?.some(
        (o) =>
          o.DomainName === originDomain &&
          (o.CustomOriginConfig?.HTTPPort === originPort || o.CustomOriginConfig?.HTTPPort === 80)
      )
    );

    if (existing?.DomainName) {
      const cloudFrontUrl = `https://${existing.DomainName}`;
      if (onLog) onLog(`[CLOUDFRONT] Found existing CloudFront distribution: ${cloudFrontUrl} (ID: ${existing.Id}) ✓`);

      // Invalidate cache for instantaneous propagation
      try {
        await cloudFrontClient.send(
          new CreateInvalidationCommand({
            DistributionId: existing.Id,
            InvalidationBatch: {
              CallerReference: `inv-${Date.now()}`,
              Paths: {
                Quantity: 1,
                Items: ["/*"],
              },
            },
          })
        );
      } catch (invErr) {
        // Invalidation is best-effort
      }

      return {
        cloudFrontUrl,
        distributionId: existing.Id,
        domainName: existing.DomainName,
      };
    }

    // 2. Create new CloudFront Distribution for EC2 Dynamic Backend API
    if (onLog) onLog(`[CLOUDFRONT] Creating new CloudFront Distribution for HTTPS Backend API...`);

    const createParams = {
      DistributionConfig: {
        CallerReference: `cloudops-ec2-${repoName}-${Date.now()}`,
        Comment: `CloudOps Backend API - ${repoName} (${originDomain}:${originPort})`,
        Enabled: true,
        Origins: {
          Quantity: 1,
          Items: [
            {
              Id: originId,
              DomainName: originDomain,
              CustomOriginConfig: {
                HTTPPort: originPort,
                HTTPSPort: 443,
                OriginProtocolPolicy: "http-only", // EC2 Docker container listens on HTTP
                OriginSslProtocols: {
                  Quantity: 1,
                  Items: ["TLSv1.2"],
                },
              },
            },
          ],
        },
        DefaultCacheBehavior: {
          TargetOriginId: originId,
          ViewerProtocolPolicy: "redirect-to-https",
          AllowedMethods: {
            Quantity: 7,
            Items: ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"],
            CachedMethods: {
              Quantity: 3,
              Items: ["GET", "HEAD", "OPTIONS"],
            },
          },
          ForwardedValues: {
            QueryString: true,
            Cookies: { Forward: "all" },
            Headers: {
              Quantity: 1,
              Items: ["*"], // Forward all headers for dynamic REST APIs
            },
          },
          MinTTL: 0,
          DefaultTTL: 0,
          MaxTTL: 0,
          Compress: true,
        },
      },
    };

    const distRes = await cloudFrontClient.send(new CreateDistributionCommand(createParams));
    if (distRes.Distribution?.DomainName) {
      const cloudFrontUrl = `https://${distRes.Distribution.DomainName}`;
      if (onLog) onLog(`[CLOUDFRONT] CloudFront HTTPS Distribution created successfully! 🚀`);
      if (onLog) onLog(`[CLOUDFRONT] Public HTTPS URL: ${cloudFrontUrl}`);

      return {
        cloudFrontUrl,
        distributionId: distRes.Distribution.Id,
        domainName: distRes.Distribution.DomainName,
      };
    }
  } catch (err) {
    if (onLog) onLog(`[WARN] CloudFront setup skipped: ${err.message}. Retaining direct EC2 URL.`);
    logger.warn(`CloudFront for EC2 warning: ${err.message}`);
    return null;
  }

  return null;
};
