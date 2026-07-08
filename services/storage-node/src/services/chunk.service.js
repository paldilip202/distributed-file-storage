const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const logger = require('../config/logger');

const STORAGE_DIR = process.env.STORAGE_DIR || './storage';

if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

class ChunkService {
  async writeChunk(chunkId, data) {
    try {
      await fs.promises.writeFile(this.getChunkPath(chunkId), data);
      const checksum = this.computeChecksum(data);
      logger.info({ message: 'Chunk written', chunkId, sizeBytes: data.length });
      return { success: true, checksum };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async readChunk(chunkId) {
    try {
      const filePath = this.getChunkPath(chunkId);
      if (!fs.existsSync(filePath))
        return { success: false, error: `Chunk ${chunkId} not found` };
      const data = await fs.promises.readFile(filePath);
      return { success: true, data, checksum: this.computeChecksum(data) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async deleteChunk(chunkId) {
    try {
      const filePath = this.getChunkPath(chunkId);
      if (!fs.existsSync(filePath))
        return { success: false, error: `Chunk ${chunkId} not found` };
      await fs.promises.unlink(filePath);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async getUsedBytes() {
    try {
      const files = await fs.promises.readdir(STORAGE_DIR);
      let total = 0;
      for (const file of files) {
        const stat = await fs.promises.stat(path.join(STORAGE_DIR, file));
        total += stat.size;
      }
      return total;
    } catch { return 0; }
  }

  getChunkPath(chunkId) { return path.join(STORAGE_DIR, `${chunkId}.chunk`); }
  computeChecksum(data) { return crypto.createHash('sha256').update(data).digest('hex'); }
}

module.exports = new ChunkService();