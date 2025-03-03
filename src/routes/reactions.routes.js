
const express = require('express');
const router = express.Router();
const reactionsController = require('../controllers/reactions.controller');
const authMiddleware = require('../middleware/auth.middleware');


router.post('/:id/reactions', authMiddleware, reactionsController.sendReaction);

module.exports = router;
