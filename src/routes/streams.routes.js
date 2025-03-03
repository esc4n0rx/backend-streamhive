// src/routes/streams.routes.js
const express = require('express');
const router = express.Router();
const streamsController = require('../controllers/streams.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Criar nova sala (requer autenticação)
router.post('/create', authMiddleware, streamsController.createStream);

// Rota para listar todas as transmissões públicas
router.get('/', streamsController.listPublicStreams);

// Obter detalhes da sala (pode ser acessado sem autenticação, conforme especificado)
router.get('/:id', streamsController.getStreamDetails);

// Entrar na sala (requer autenticação)
router.post('/:id/join', authMiddleware, streamsController.joinStream);

// Sair da sala (requer autenticação)
router.post('/:id/leave', authMiddleware, streamsController.leaveStream);

// Encerrar a transmissão (requer autenticação e somente o host pode encerrar)
router.delete('/:id', authMiddleware, streamsController.deleteStream);

module.exports = router;
