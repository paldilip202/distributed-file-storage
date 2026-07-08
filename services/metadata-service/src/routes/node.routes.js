const express = require('express');
const router = express.Router();
const { registerNode, heartbeat, getAllNodes } = require('../controllers/node.controller');

router.post('/register', registerNode);
router.post('/:nodeId/heartbeat', heartbeat);
router.get('/', getAllNodes);

module.exports = router;