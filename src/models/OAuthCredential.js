const mongoose = require('mongoose');

const oauthCredentialSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  platform: { type: String, enum: ['github', 'gitlab', 'bitbucket', 'gitee'], required: true },
  accessToken: { type: String, required: true },
  username: { type: String, required: true }, // Added to support URL construction
  createdAt: { type: Date, default: Date.now }
});

oauthCredentialSchema.index({ userId: 1, platform: 1 }, { unique: true });

module.exports = mongoose.model('OAuthCredential', oauthCredentialSchema);
