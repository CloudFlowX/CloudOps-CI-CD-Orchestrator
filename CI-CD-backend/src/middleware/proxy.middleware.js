import { createProxyMiddleware } from "http-proxy-middleware";
import Pipeline from "../models/pipeline.model.js";

export const proxySubdomains = async (req, res, next) => {
  try {
    const hostname = req.hostname; // e.g. "my-project.localhost" or "localhost"
    
    // Ignore direct IP, localhost, or without subdomains
    if (hostname === "localhost" || hostname === "127.0.0.1" || !hostname.includes(".")) {
      return next();
    }

    const parts = hostname.split(".");
    // e.g. ["my-project", "localhost"]
    if (parts.length >= 2 && parts[1] === "localhost") {
      const projectName = parts[0];

      // Find pipeline by name (or repo name)
      const pipeline = await Pipeline.findOne({ name: projectName, status: "success" });

      if (!pipeline) {
        return res.status(404).send(`Project '${projectName}' not found or not deployed.`);
      }

      const targetPort = pipeline.containerPort || pipeline.appPort || 3000;
      const targetUrl = `http://127.0.0.1:${targetPort}`;

      // Create and execute proxy dynamically
      const proxy = createProxyMiddleware({
        target: targetUrl,
        changeOrigin: true,
        ws: true,
        logLevel: 'silent'
      });

      return proxy(req, res, next);
    }

    next();
  } catch (error) {
    console.error("Proxy Error:", error);
    next(error);
  }
};
