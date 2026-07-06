const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const { uploadToGit } = require('../services/gitUpload');
const OAuthCredential = require('../models/OAuthCredential');
const gitDomains = require('../config/gitDomains');

const upload = multer({ dest: os.tmpdir() });

router.put('/Git/*noProtocolURL', upload.array('files'), async (req, res, next) => {
  try {
    // Extract URL path after /Git/
    const noProtocolURL = req.params[0]; // e.g., 'github.com/user/repo'
    if (!noProtocolURL) {
      return res.status(400).json({ error: 'Repository URL is required' });
    }

    // Determine platform from URL
    const platform = Object.keys(gitDomains).find(key => noProtocolURL.startsWith(gitDomains[key]));
    if (!platform) {
      return res.status(400).json({ error: 'Unsupported Git platform' });
    }

    // Get OAuth credentials for current user
    const user = req.user; // Assume authentication middleware sets req.user
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const credentials = await OAuthCredential.findOne({ userId: user.id, platform });
    if (!credentials) {
      return res.status(403).json({ error: 'No OAuth credentials for this platform' });
    }

    // Build authenticated URL: https://username:accessToken@domain/path
    const repoURL = `https://${credentials.username}:${credentials.accessToken}@${noProtocolURL}`;

    // Process uploaded files: save to temp directory and map paths
    const tempDir = path.join(os.tmpdir(), `git-upload-${Date.now()}`);
    await fs.ensureDir(tempDir);
    const fileEntries = [];
    for (const file of req.files) {
      const filePath = file.originalname; // key is the path
      const destPath = path.join(tempDir, filePath);
      await fs.move(file.path, destPath, { overwrite: true });
      fileEntries.push({ path: filePath, content: destPath });
    }

    // Upload using git-utility
    await uploadToGit(repoURL, tempDir, req.body.commitMessage || 'Upload multiple files');

    // Clean up
    await fs.remove(tempDir);

    res.json({ success: true, message: 'Files uploaded successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
