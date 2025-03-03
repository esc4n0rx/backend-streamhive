// src/routes/streams.routes.js
const express = require('express');
const router = express.Router();
const streamsController = require('../controllers/streams.controller');
const authMiddleware = require('../middleware/auth.middleware');


router.post('/create', authMiddleware, streamsController.createStream);


router.get('/', streamsController.listPublicStreams);


router.get('/:id', streamsController.getStreamDetails);


router.post('/:id/join', authMiddleware, streamsController.joinStream);


router.post('/:id/leave', authMiddleware, streamsController.leaveStream);


router.delete('/:id', authMiddleware, streamsController.deleteStream);

module.exports = router;
