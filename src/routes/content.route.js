const express = require('express');
const router = express.Router();
const contentsController = require('../controllers/contentsController');

router.get('/', contentsController.getContents);

module.exports = router;
