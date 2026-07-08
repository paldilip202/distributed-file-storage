const nodeService = require('../services/node.service');
const asyncHandler = require('../middleware/asyncHandler');

const registerNode = asyncHandler(async (req, res) => {
  const { host, port, capacityBytes } = req.body;
  if (!host || !port || !capacityBytes)
    return res.status(400).json({
      success: false,
      error: 'host, port, capacityBytes required',
    });
  const node = await nodeService.registerNode(host, port, capacityBytes);
  res.status(201).json({ success: true, data: node });
});

// ✅ FIX: usedBytes ko heartbeat controller se ignore karo
const heartbeat = asyncHandler(async (req, res) => {
  const { nodeId } = req.params;
  const node = await nodeService.heartbeat(nodeId);
  res.json({ success: true, data: node });
});

const getAllNodes = asyncHandler(async (req, res) => {
  const nodes = await nodeService.getAllNodes();
  res.json({ success: true, data: nodes });
});

module.exports = { registerNode, heartbeat, getAllNodes };