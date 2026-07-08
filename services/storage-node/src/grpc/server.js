const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const chunkService = require('../services/chunk.service');
const logger = require('../config/logger');

const PROTO_PATH = path.join(__dirname, '../../proto/storage.proto');
const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
});
const storageProto = grpc.loadPackageDefinition(packageDef).storage;

async function WriteChunk(call, callback) {
  const { chunk_id, data } = call.request;
  const result = await chunkService.writeChunk(chunk_id, data);
  callback(null, { success: result.success, checksum: result.checksum || '', error: result.error || '' });
}

async function ReadChunk(call, callback) {
  const { chunk_id } = call.request;
  const result = await chunkService.readChunk(chunk_id);
  callback(null, {
    success: result.success,
    data: result.data || Buffer.alloc(0),
    checksum: result.checksum || '',
    error: result.error || '',
  });
}

async function DeleteChunk(call, callback) {
  const result = await chunkService.deleteChunk(call.request.chunk_id);
  callback(null, { success: result.success, error: result.error || '' });
}

async function Ping(call, callback) {
  const usedBytes = await chunkService.getUsedBytes();
  callback(null, { alive: true, used_bytes: usedBytes });
}

function startGrpcServer() {
  const server = new grpc.Server();
  server.addService(storageProto.StorageNode.service, { WriteChunk, ReadChunk, DeleteChunk, Ping });
  const GRPC_PORT = process.env.GRPC_PORT || 6001;
  server.bindAsync(
    `0.0.0.0:${GRPC_PORT}`,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) { logger.error({ message: 'gRPC start failed', error: err.message }); process.exit(1); }
      server.start();
      logger.info(`✅ gRPC Storage Node listening on port ${port}`);
    }
  );
}

module.exports = { startGrpcServer };