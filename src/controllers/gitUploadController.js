const gitService = require('../services/gitService');
const oauthService = require('../services/oauthService');
const path = require('path');
const fs = require('fs-extra');
const tmp = require('tmp');

async function handleUpload(req, res) {
  try {
    const { noProtocolURL } = req.params;
    const files = req.files; // multer provides array of file objects

    // Validate noProtocolURL
    if (!noProtocolURL) {
      return res.status(400).json({ error: 'Missing noProtocolURL' });
    }

    // Extract host from URL (e.g., github.com/user/repo.git -> github.com)
    const host = noProtocolURL.split('/')[0];
    const platform = oauthService.getPlatformByDomain(host);
    if (!platform) {
      return res.status(400).json({ error: `Unknown platform for domain: ${host}` });
    }

    // Get OAuth credentials for current user (req.user assumed from auth middleware)
    const userId = req.user ? req.user.id : null;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const credential = await oauthService.getCredential(userId, platform);
    if (!credential) {
      return res.status(401).json({ error: `No OAuth credential found for platform ${platform}` });
    }

    // Construct authenticated URL
    const authURL = `https://${credential.username}:${credential.accessToken}@${noProtocolURL}`;

    // Create temp directory
    const tmpDir = tmp.dirSync({ unsafeCleanup: true });
    const repoPath = tmpDir.name;

    // Clone repository
    await gitService.clone(authURL, repoPath);

    // Write files from FormData
    for (const file of files) {
      const filePath = path.join(repoPath, file.originalname);
      await fs.ensureDir(path.dirname(filePath));
      await fs.move(file.path, filePath, { overwrite: true });
    }

    // Commit and push
    await gitService.commitAndPush(repoPath, 'Upload multiple files via HOP-service');

    // Cleanup
    tmpDir.removeCallback();

    res.json({ success: true, message: 'Files uploaded successfully' });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = { handleUpload };