import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketWebsiteCommand,
  PutPublicAccessBlockCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import {
  CloudFrontClient,
  CreateDistributionCommand,
  ListDistributionsCommand,
  CreateInvalidationCommand,
} from "@aws-sdk/client-cloudfront";
import fs from "fs";
import path from "path";
import mime from "mime-types";
import logger from "../config/logger.js";

/**
 * Detect build output directory (dist, build, out, or root for static websites)
 */
export const detectBuildDirectory = (projectPath, onLog) => {
  const candidates = [
    path.join(projectPath, "dist"),
    path.join(projectPath, "build"),
    path.join(projectPath, "out"),
    path.join(projectPath, "public"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      const files = fs.readdirSync(candidate);
      if (
        files.length > 0 &&
        files.some(
          (f) => f.endsWith(".html") || f === "index.html" || f === "assets"
        )
      ) {
        if (onLog)
          onLog(
            `[S3] Build output detected at: ${path.relative(projectPath, candidate)}/`
          );
        return candidate;
      }
    }
  }

  // If project root has index.html
  if (fs.existsSync(path.join(projectPath, "index.html"))) {
    if (onLog)
      onLog(
        `[S3] Static website detected in repository root (index.html found).`
      );
    return projectPath;
  }

  // Any HTML file in project root
  try {
    const rootFiles = fs.readdirSync(projectPath);
    if (rootFiles.some((f) => f.endsWith(".html"))) {
      if (onLog) onLog(`[S3] Static HTML files detected in repository root.`);
      return projectPath;
    }
  } catch (e) {}

  if (fs.existsSync(path.join(projectPath, "dist"))) {
    return path.join(projectPath, "dist");
  }

  return projectPath;
};

/**
 * Recursively collect all files from a directory
 */
const getAllFiles = (dirPath, arrayOfFiles = []) => {
  const entries = fs.readdirSync(dirPath);
  for (const entry of entries) {
    if (
      entry === ".git" ||
      entry === "node_modules" ||
      entry === ".env" ||
      entry === ".DS_Store"
    ) {
      continue;
    }
    const fullPath = path.join(dirPath, entry);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  }
  return arrayOfFiles;
};

/**
 * Sanitize S3 bucket name (lowercase, alphanumeric, dashes, 3-63 chars)
 */
export const sanitizeBucketName = (rawName, suffix = "") => {
  let name = (rawName || "app")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (suffix) {
    name = `${name}-${suffix}`;
  }

  // Ensure prefix
  if (!name.startsWith("cloudops-")) {
    name = `cloudops-${name}`;
  }

  // Max 63 characters
  if (name.length > 63) {
    name = name.substring(0, 63).replace(/-$/, "");
  }

  return name;
};

/**
 * Deploy built files to AWS S3 Static Website and CloudFront
 */
export const deployToS3AndCloudFront = async ({
  credentials,
  region = "us-east-1",
  bucketName: customBucketName,
  repoName,
  projectPath,
  onLog = () => {},
}) => {
  const resolvedRegion = region || "us-east-1";
  const s3Client = new S3Client({
    region: resolvedRegion,
    credentials,
  });

  const cloudFrontClient = new CloudFrontClient({
    region: "us-east-1", // CloudFront API is always us-east-1
    credentials,
  });

  // 1. Determine Bucket Name
  const bucketName =
    customBucketName ||
    sanitizeBucketName(
      repoName,
      Math.random().toString(36).substring(2, 7)
    );

  onLog(`[S3] Initializing deployment to S3 bucket: "${bucketName}" (Region: ${resolvedRegion})...`);

  // 2. Create or verify S3 Bucket
  let bucketExists = false;
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
    bucketExists = true;
    onLog(`[S3] Bucket "${bucketName}" already exists. Reusing existing bucket.`);
  } catch (headErr) {
    // Bucket does not exist or no permission
    bucketExists = false;
  }

  if (!bucketExists) {
    onLog(`[S3] Creating new S3 bucket: "${bucketName}"...`);
    const createParams = { Bucket: bucketName };
    if (resolvedRegion !== "us-east-1") {
      createParams.CreateBucketConfiguration = {
        LocationConstraint: resolvedRegion,
      };
    }

    try {
      await s3Client.send(new CreateBucketCommand(createParams));
      onLog(`[S3] Bucket "${bucketName}" created successfully ✓`);
    } catch (createErr) {
      if (createErr.name === "BucketAlreadyOwnedByYou") {
        onLog(`[S3] Bucket "${bucketName}" is already owned by your AWS account.`);
      } else {
        onLog(`[ERROR] Failed to create S3 bucket "${bucketName}": ${createErr.message}`);
        throw createErr;
      }
    }
  }

  // 3. Configure Public Access Block (Disable block to allow website hosting)
  try {
    onLog(`[S3] Configuring bucket access permissions for public website hosting...`);
    await s3Client.send(
      new PutPublicAccessBlockCommand({
        Bucket: bucketName,
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: false,
          IgnorePublicAcls: false,
          BlockPublicPolicy: false,
          RestrictPublicBuckets: false,
        },
      })
    );
  } catch (pabErr) {
    onLog(`[WARN] Could not update PublicAccessBlock: ${pabErr.message}`);
  }

  // 4. Configure Bucket Policy for Public Read
  try {
    const bucketPolicy = {
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "PublicReadGetObject",
          Effect: "Allow",
          Principal: "*",
          Action: "s3:GetObject",
          Resource: `arn:aws:s3:::${bucketName}/*`,
        },
      ],
    };

    await s3Client.send(
      new PutBucketPolicyCommand({
        Bucket: bucketName,
        Policy: JSON.stringify(bucketPolicy),
      })
    );
    onLog(`[S3] Public read policy applied to bucket "${bucketName}" ✓`);
  } catch (policyErr) {
    onLog(`[WARN] Bucket policy warning: ${policyErr.message}`);
  }

  // 5. Enable Static Website Hosting
  try {
    await s3Client.send(
      new PutBucketWebsiteCommand({
        Bucket: bucketName,
        WebsiteConfiguration: {
          IndexDocument: { Suffix: "index.html" },
          ErrorDocument: { Key: "index.html" }, // SPA fallback support
        },
      })
    );
    onLog(`[S3] Static Website Hosting enabled on bucket "${bucketName}" ✓`);
  } catch (webErr) {
    onLog(`[WARN] Could not enable static website configuration: ${webErr.message}`);
  }

  // 6. Find Build Directory and Upload Files
  const buildDir = detectBuildDirectory(projectPath, onLog);
  onLog(`[S3] Preparing assets for upload from: ${buildDir}...`);

  const filesToUpload = getAllFiles(buildDir);
  if (filesToUpload.length === 0) {
    throw new Error(`No files found to upload in build directory: ${buildDir}`);
  }

  onLog(`[S3] Uploading ${filesToUpload.length} files to S3...`);

  let uploadedCount = 0;
  for (const filePath of filesToUpload) {
    const relativeKey = path
      .relative(buildDir, filePath)
      .replace(/\\/g, "/"); // Ensure forward slashes for S3 keys

    const contentType =
      mime.lookup(filePath) || "application/octet-stream";
    const fileBody = fs.readFileSync(filePath);

    // Cache control: HTML files no-cache (instant updates), assets 1 year
    const isHtml = relativeKey.endsWith(".html");
    const cacheControl = isHtml
      ? "max-age=0, no-cache, no-store, must-revalidate"
      : "public, max-age=31536000, immutable";

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: relativeKey,
        Body: fileBody,
        ContentType: contentType,
        CacheControl: cacheControl,
      })
    );

    uploadedCount++;
    if (uploadedCount % 10 === 0 || uploadedCount === filesToUpload.length) {
      onLog(`[S3] Uploaded ${uploadedCount}/${filesToUpload.length} files...`);
    }
  }

  onLog(`[S3] All ${filesToUpload.length} files uploaded to S3 successfully ✓`);

  // 7. Compute S3 Website Endpoint
  // Standard format for S3 website endpoints
  let s3WebsiteUrl = "";
  if (resolvedRegion === "us-east-1") {
    s3WebsiteUrl = `http://${bucketName}.s3-website-us-east-1.amazonaws.com`;
  } else {
    s3WebsiteUrl = `http://${bucketName}.s3-website.${resolvedRegion}.amazonaws.com`;
  }

  onLog(`[S3] Direct S3 Website URL: ${s3WebsiteUrl}`);

  // 8. CloudFront Global CDN Distribution (Best-effort for free HTTPS & permanent URL)
  let cloudFrontUrl = null;
  let distributionId = null;

  try {
    onLog(`[CLOUDFRONT] Checking for existing CloudFront distribution for S3 origin...`);
    const s3OriginDomain =
      resolvedRegion === "us-east-1"
        ? `${bucketName}.s3-website-us-east-1.amazonaws.com`
        : `${bucketName}.s3-website.${resolvedRegion}.amazonaws.com`;

    const listRes = await cloudFrontClient.send(new ListDistributionsCommand({ MaxItems: 50 }));
    const existing = listRes.DistributionList?.Items?.find((d) =>
      d.Origins?.Items?.some((o) => o.DomainName === s3OriginDomain)
    );

    if (existing) {
      distributionId = existing.Id;
      cloudFrontUrl = `https://${existing.DomainName}`;
      onLog(`[CLOUDFRONT] Reusing existing CloudFront distribution: ${cloudFrontUrl} (ID: ${distributionId})`);

      // Invalidate cache so latest update is visible instantly
      try {
        await cloudFrontClient.send(
          new CreateInvalidationCommand({
            DistributionId: distributionId,
            InvalidationBatch: {
              CallerReference: `inv-${Date.now()}`,
              Paths: {
                Quantity: 1,
                Items: ["/*"],
              },
            },
          })
        );
        onLog(`[CLOUDFRONT] CDN cache invalidation triggered for fast global refresh ✓`);
      } catch (invErr) {
        onLog(`[WARN] CloudFront invalidation warning: ${invErr.message}`);
      }
    } else {
      onLog(`[CLOUDFRONT] Creating new CloudFront Distribution for HTTPS & Global CDN...`);
      const createDistConfig = {
        DistributionConfig: {
          CallerReference: `cloudops-${bucketName}-${Date.now()}`,
          Comment: `CloudOps Orchestrator - ${repoName}`,
          Enabled: true,
          DefaultRootObject: "index.html",
          Origins: {
            Quantity: 1,
            Items: [
              {
                Id: `S3Website-${bucketName}`,
                DomainName: s3OriginDomain,
                CustomOriginConfig: {
                  HTTPPort: 80,
                  HTTPSPort: 443,
                  OriginProtocolPolicy: "http-only", // S3 website endpoints are HTTP
                  OriginSslProtocols: {
                    Quantity: 1,
                    Items: ["TLSv1.2"],
                  },
                },
              },
            ],
          },
          DefaultCacheBehavior: {
            TargetOriginId: `S3Website-${bucketName}`,
            ViewerProtocolPolicy: "redirect-to-https",
            AllowedMethods: {
              Quantity: 2,
              Items: ["GET", "HEAD"],
              CachedMethods: {
                Quantity: 2,
                Items: ["GET", "HEAD"],
              },
            },
            ForwardedValues: {
              QueryString: false,
              Cookies: { Forward: "none" },
            },
            MinTTL: 0,
            DefaultTTL: 86400,
            MaxTTL: 31536000,
            Compress: true,
          },
          CustomErrorResponses: {
            Quantity: 1,
            Items: [
              {
                ErrorCode: 404,
                ResponsePagePath: "/index.html",
                ResponseCode: "200",
                ErrorCachingMinTTL: 300,
              },
            ],
          },
        },
      };

      const distRes = await cloudFrontClient.send(
        new CreateDistributionCommand(createDistConfig)
      );
      if (distRes.Distribution?.DomainName) {
        distributionId = distRes.Distribution.Id;
        cloudFrontUrl = `https://${distRes.Distribution.DomainName}`;
        onLog(`[CLOUDFRONT] CloudFront distribution created! 🚀`);
        onLog(`[CLOUDFRONT] HTTPS Permanent URL: ${cloudFrontUrl}`);
      }
    }
  } catch (cfErr) {
    onLog(
      `[INFO] CloudFront CDN setup skipped (${cfErr.message || "IAM permissions"}). S3 Website is directly accessible.`
    );
  }

  const finalDeployedUrl = cloudFrontUrl || s3WebsiteUrl;

  onLog(`[DEPLOY] ====================================================`);
  onLog(`[DEPLOY] 🎉 DEPLOYMENT SUCCESSFUL! (100% Serverless - No EC2)`);
  onLog(`[DEPLOY] S3 Bucket: ${bucketName}`);
  onLog(`[DEPLOY] Permanent Live URL: ${finalDeployedUrl}`);
  onLog(`[DEPLOY] ====================================================`);

  return {
    bucketName,
    s3WebsiteUrl,
    cloudFrontUrl,
    deployedUrl: finalDeployedUrl,
    distributionId,
  };
};
