const express = require('express');
const router = express.Router();
const gitUploadController = require('../controllers/gitUploadController');

// PUT /file/Git/:noProtocolURL
router.put('/:noProtocolURL', gitUploadController.handleUpload);

module.exports = router;