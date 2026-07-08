require('dotenv').config();
const express = require('express');
const errorHandler = require('./middleware/errorHandler');
const { startHeartbeatWorker } = require('./workers/heartbeatWorker');

const healthRoutes = require('./routes/health.routes');
const nodeRoutes   = require('./routes/node.routes');
const fileRoutes   = require('./routes/file.routes');

const app = express();
app.use(express.json({ limit: '10mb' }));

app.use('/health', healthRoutes);
app.use('/api/nodes', nodeRoutes);
app.use('/api/files', fileRoutes);
app.use(errorHandler);

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`✅ Metadata Service running on port ${PORT}`);
  startHeartbeatWorker();
});

module.exports = app;