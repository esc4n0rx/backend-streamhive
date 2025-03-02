// src/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// Rota para registro de usuário
router.post('/register', authController.register);

// Rota para login
router.post('/login', authController.login);

module.exports = router;
