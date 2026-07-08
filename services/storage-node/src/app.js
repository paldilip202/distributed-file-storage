require('dotenv').config();
const { startGrpcServer } = require('./grpc/server');
const { startHeartbeatWorker } = require('./workers/heartbeat');
const logger = require('./config/logger');

async function main() {
  logger.info('Starting Storage Node...');
  startGrpcServer();
  await startHeartbeatWorker();
}

main().catch((err) => {
  console.error('Storage node crashed:', err.message);
  process.exit(1);
});