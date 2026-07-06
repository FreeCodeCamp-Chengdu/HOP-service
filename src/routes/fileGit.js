const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const { uploadToGit } = require('../utils/gitUtils');
const { authenticate } = require('../middleware/authenticate');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// PUT /file/Git/*noProtocolURL
router.put('/file/Git/:url(*)', authenticate, upload.any(), async (req, res, next) => {
  try {
    const gitBaseUrl = req.params.url;
    if (!gitBaseUrl) {
      return res.status(400).json({ error: 'No git URL provided' });
    }

    // 获取当前登录用户的OAuth凭据
    const user = req.user;
    if (!user || !user.oauthCredentials) {
      return res.status(401).json({ error: 'User not authenticated or missing credentials' });
    }

    // 根据gitBaseUrl识别平台并获取凭据
    const platform = Object.keys(platformMap).find(key => gitBaseUrl.includes(platformMap[key]));
    if (!platform) {
      return res.status(400).json({ error: 'Unsupported git platform' });
    }
    const credential = user.oauthCredentials.find(c => c.platform === platform);
    if (!credential) {
      return res.status(401).json({ error: `Missing OAuth credentials for ${platform}` });
    }

    // 构建带认证的URL
    const authUrl = `https://${credential.username}:${credential.accessToken}@${gitBaseUrl}`;

    // 将上传的文件保存到临时目录
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-upload-'));
    const fileEntries = [];
    for (const file of req.files) {
      const filePath = file.fieldname; // 键名是路径
      const fullPath = path.join(tmpDir, filePath);
      await fs.ensureDir(path.dirname(fullPath));
      await fs.writeFile(fullPath, file.buffer);
      fileEntries.push({ path: filePath, content: file.buffer });
    }

    // 使用git-utility上传
    const result = await uploadToGit(authUrl, tmpDir, fileEntries);

    // 清理临时目录
    await fs.remove(tmpDir);

    res.json({ success: true, commit: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
