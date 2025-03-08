const express = require('express');
const router = express.Router();
const contentsController = require('../controllers/contentsController');

router.get('/', contentsController.searchContents);

module.exports = router;
