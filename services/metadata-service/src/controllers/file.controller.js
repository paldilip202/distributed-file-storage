const fileService = require('../services/file.service');
const asyncHandler = require('../middleware/asyncHandler');

const initiateUpload = asyncHandler(async (req, res) => {
  const { filename, sizeBytes, mimeType } = req.body;
  const ownerId = req.headers['x-user-id'];
  if (!filename || !sizeBytes || !ownerId)
    return res.status(400).json({ success: false, error: 'filename, sizeBytes, x-user-id required' });
  const result = await fileService.initiateUpload(ownerId, filename, parseInt(sizeBytes), mimeType);
  res.status(201).json({ success: true, data: result });
});

const confirmUpload = asyncHandler(async (req, res) => {
  const { fileId } = req.params;
  const { chunkConfirmations } = req.body;
  if (!chunkConfirmations || !Array.isArray(chunkConfirmations))
    return res.status(400).json({ success: false, error: 'chunkConfirmations array required' });
  const file = await fileService.confirmUpload(fileId, chunkConfirmations);
  res.json({ success: true, data: file });
});

const getDownloadPlan = asyncHandler(async (req, res) => {
  const { fileId } = req.params;
  const requesterId = req.headers['x-user-id'];
  const plan = await fileService.getDownloadPlan(fileId, requesterId);
  res.json({ success: true, data: plan });
});

const getUserFiles = asyncHandler(async (req, res) => {
  const ownerId = req.headers['x-user-id'];
  const files = await fileService.getUserFiles(ownerId);
  res.json({ success: true, data: files });
});

const deleteFile = asyncHandler(async (req, res) => {
  const { fileId } = req.params;
  const ownerId = req.headers['x-user-id'];
  const file = await fileService.deleteFile(fileId, ownerId);
  res.json({ success: true, data: file });
});

module.exports = { initiateUpload, confirmUpload, getDownloadPlan, getUserFiles, deleteFile };