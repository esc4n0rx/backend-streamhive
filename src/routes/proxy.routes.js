// routes/proxy.routes.js
const express = require("express");
const router = express.Router();
const proxyController = require("../controllers/proxy.controller");

// Exemplo: GET /api/proxy?url=http://exemplo.com/video.mp4
router.get("/", proxyController.proxyVideo);

module.exports = router;
