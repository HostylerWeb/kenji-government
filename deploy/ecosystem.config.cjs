/**
 * PM2 process list for GRA government portal on VPS.
 * Usage: pm2 start deploy/ecosystem.config.cjs && pm2 save
 */
module.exports = {
  apps: [
    {
      name: "gra-api",
      cwd: "./apps/api",
      script: "dist/main.js",
      instances: 1,
      exec_mode: "fork",
      env: { NODE_ENV: "production", API_PORT: "4000" },
    },
    {
      name: "gra-ingest",
      cwd: "./apps/api",
      script: "dist/ingest-main.js",
      instances: 1,
      exec_mode: "fork",
      env: { NODE_ENV: "production", INGEST_PORT: "4001" },
    },
    {
      name: "gra-worker",
      cwd: "./apps/worker",
      script: "dist/main.js",
      instances: 1,
      exec_mode: "fork",
      env: { NODE_ENV: "production" },
    },
    {
      name: "gra-web",
      cwd: "./apps/web",
      script: "node_modules/next/dist/bin/next",
      args: "start --port 3000",
      instances: 1,
      exec_mode: "fork",
      env: { NODE_ENV: "production" },
    },
  ],
};
