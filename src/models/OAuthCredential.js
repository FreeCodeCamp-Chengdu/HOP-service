const mongoose = require('mongoose');

const oauthCredentialSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  platform: { type: String, required: true, enum: ['github', 'gitlab', 'bitbucket'] },
  username: { type: String, required: true },
  accessToken: { type: String, required: true },
  refreshToken: { type: String },
  expiresAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('OAuthCredential', oauthCredentialSchema);
