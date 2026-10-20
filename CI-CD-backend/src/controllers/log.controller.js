import Pipeline from "../models/pipeline.model.js";
import AuditLog from "../models/auditLog.model.js";
import logger from "../config/logger.js";

// ======================================
// Get All System & Pipeline Logs
// ======================================
export const getLogs = async (req, res) => {
  try {
    const allLogs = [];

    // 1. Fetch Pipeline Execution Logs
    const pipelines = await Pipeline.find().select("name status logs environment ec2InstanceId createdAt updatedAt");

    for (const p of pipelines) {
      if (Array.isArray(p.logs) && p.logs.length > 0) {
        p.logs.forEach((line, idx) => {
          if (!line || typeof line !== 'string') return;
          const cleanLine = line.trim();
          if (!cleanLine) return;

          const isErr = cleanLine.includes('[ERROR]') || cleanLine.includes('ERR!') || cleanLine.includes('Failed') || cleanLine.includes('failed');
          const isSuccess = cleanLine.includes('[SUCCESS]') || cleanLine.includes('successful') || cleanLine.includes('✓');
          const isWarn = cleanLine.includes('[WARN]');
          const level = isErr ? 'ERROR' : (isSuccess ? 'SUCCESS' : (isWarn ? 'WARN' : 'INFO'));

          const logTime = p.updatedAt 
            ? new Date(p.updatedAt).toISOString().replace('T', ' ').substring(0, 19)
            : new Date(p.createdAt).toISOString().replace('T', ' ').substring(0, 19);

          allLogs.push({
            id: `${p._id}-${idx}`,
            timestamp: logTime,
            level: level,
            service: `Pipeline: ${p.name}`,
            message: cleanLine,
            requestId: `req-${p._id.toString().slice(-6)}`,
            traceId: `trace-${p._id.toString().slice(-6)}`,
            environment: p.environment || "production",
            containerId: p.ec2InstanceId || "ec2-host"
          });
        });
      }
    }

    // 2. Fetch Audit Logs as System Events
    const auditLogs = await AuditLog.find().populate("user", "fullName").sort({ createdAt: -1 }).limit(50);
    for (const a of auditLogs) {
      const level = a.status === 'failed' ? 'ERROR' : (a.status === 'warning' ? 'WARN' : 'INFO');
      allLogs.push({
        id: `audit-${a._id}`,
        timestamp: new Date(a.createdAt).toISOString().replace('T', ' ').substring(0, 19),
        level: level,
        service: "CloudOps Orchestrator",
        message: `${a.action}: ${a.resource} by ${a.user?.fullName || 'System'} (${a.details || 'Success'})`,
        requestId: `req-${a._id.toString().slice(-6)}`,
        traceId: `trace-audit`,
        environment: "production",
        containerId: "host-mac"
      });
    }

    // 3. Fallback baseline system log
    allLogs.push({
      id: 'system-online',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      level: 'INFO',
      service: 'CloudOps Orchestrator',
      message: 'CloudOps CI/CD Orchestrator engine running normally.',
      requestId: 'req-system',
      traceId: 'trace-system',
      environment: process.env.NODE_ENV || 'production',
      containerId: 'host-mac'
    });

    // Sort chronologically
    allLogs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return res.status(200).json({
      success: true,
      count: allLogs.length,
      logs: allLogs.slice(-1000)
    });
  } catch (error) {
    logger.error("GET LOGS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
