// This model represents the OAuthCredential table.
// In production, use a database (e.g., MongoDB with Mongoose).
// Example Mongoose schema:
// const mongoose = require('mongoose');
// const OAuthCredentialSchema = new mongoose.Schema({
//   userId: { type: mongoose.Schema.Types.ObjectId, required: true },
//   platform: { type: String, required: true },
//   username: { type: String, required: true },
//   accessToken: { type: String, required: true },
// });
// module.exports = mongoose.model('OAuthCredential', OAuthCredentialSchema);

// For this implementation, we use the service layer with in-memory store.
// See src/services/oauthService.js for usage.

module.exports = {};