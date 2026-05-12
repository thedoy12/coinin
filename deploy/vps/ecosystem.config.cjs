module.exports = {
  apps: [
    {
      name: "coinin",
      cwd: "/var/www/coinin",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: "3001",
        AUTO_SYNC_JOBS: "false",
      },
      max_memory_restart: "512M",
      time: true,
    },
  ],
};
