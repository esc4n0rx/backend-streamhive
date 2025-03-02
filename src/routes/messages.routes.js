// src/routes/messages.routes.js
const express = require('express');
const router = express.Router();
const messagesController = require('../controllers/messages.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Rota para obter mensagens da sala
router.get('/:id/messages', messagesController.getMessages);

// Rota para enviar mensagem (requer autenticação)
router.post('/:id/messages', authMiddleware, messagesController.sendMessage);

module.exports = router;
