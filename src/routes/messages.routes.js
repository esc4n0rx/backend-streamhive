const express = require('express');
const router = express.Router();
const messagesController = require('../controllers/messages.controller');
const authMiddleware = require('../middleware/auth.middleware');


router.get('/:id/messages', messagesController.getMessages);


router.post('/:id/messages', authMiddleware, messagesController.sendMessage);

module.exports = router;
