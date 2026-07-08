const express = require('express');
const router = express.Router();
const { initiateUpload, confirmUpload, getDownloadPlan, getUserFiles, deleteFile } =
  require('../controllers/file.controller');

router.post('/initiate', initiateUpload);
router.post('/:fileId/confirm', confirmUpload);
router.get('/:fileId/download-plan', getDownloadPlan);
router.get('/', getUserFiles);
router.delete('/:fileId', deleteFile);

module.exports = router;