// PM2 (VPS):  npm install -g pm2 && pm2 start ecosystem.config.cjs && pm2 save && pm2 startup
// Keep ONE instance: rate limits and the JSON file store live in the process.
module.exports = {
  apps: [{
    name: 'safari-rescue',
    script: 'server.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    max_memory_restart: '300M',
    env: { NODE_ENV: 'production', PORT: 3000, HOST: '127.0.0.1' },
  }],
};
