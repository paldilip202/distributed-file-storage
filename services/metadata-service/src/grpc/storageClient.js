const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, '../../proto/storage.proto');
const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
});
const storageProto = grpc.loadPackageDefinition(packageDef).storage;
const clientCache = {};

function getClient(host, grpcPort) {
  const key = `${host}:${grpcPort}`;
  if (!clientCache[key]) {
    clientCache[key] = new storageProto.StorageNode(key, grpc.credentials.createInsecure());
  }
  return clientCache[key];
}

function writeChunk(host, grpcPort, chunkId, data) {
  return new Promise((resolve, reject) => {
    getClient(host, grpcPort).WriteChunk({ chunk_id: chunkId, data }, (err, res) => {
      if (err) return reject(err);
      resolve(res);
    });
  });
}

function readChunk(host, grpcPort, chunkId) {
  return new Promise((resolve, reject) => {
    getClient(host, grpcPort).ReadChunk({ chunk_id: chunkId }, (err, res) => {
      if (err) return reject(err);
      resolve(res);
    });
  });
}

function deleteChunk(host, grpcPort, chunkId) {
  return new Promise((resolve, reject) => {
    getClient(host, grpcPort).DeleteChunk({ chunk_id: chunkId }, (err, res) => {
      if (err) return reject(err);
      resolve(res);
    });
  });
}

module.exports = { writeChunk, readChunk, deleteChunk };