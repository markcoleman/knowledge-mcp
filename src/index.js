const config = require('./config');
const { createApp } = require('./app');

config.validate();

const app = createApp();
const server = app.listen(config.port, () => {
  console.log(`API listening on port ${config.port}`);
});

function shutdown(signal) {
  console.log(`Received ${signal}; shutting down...`);
  server.close(() => {
    process.exit(0);
  });

  // Force-exit if the server won't close.
  setTimeout(() => {
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
