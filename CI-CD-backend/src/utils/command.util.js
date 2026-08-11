import { exec } from "child_process";

export const runCommand = (command, cwd, onLog) => {
  return new Promise((resolve, reject) => {
    const child = exec(
      command,
      {
        cwd,
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        timeout: 5 * 60 * 1000, // 5 minute timeout
      },
      (error, stdout, stderr) => {
        if (error) {
          console.error(`[CMD ERROR] Command: ${command}`);
          console.error(`[CMD ERROR] Exit Code: ${error.code}`);
          console.error(`[CMD ERROR] stderr: ${stderr}`);
          return reject(new Error(stderr || error.message));
        }

        // Log stderr as warnings (some tools output to stderr even on success)
        if (stderr) {
          console.warn(`[CMD WARN] ${command}: ${stderr.substring(0, 200)}`);
        }

        resolve(stdout);
      }
    );

    if (onLog && typeof onLog === 'function') {
      if (child.stdout) {
        child.stdout.on('data', (data) => {
          onLog(data.toString());
        });
      }
      if (child.stderr) {
        child.stderr.on('data', (data) => {
          onLog(data.toString());
        });
      }
    }
  });
};