const platformDomains = require('../config/platformDomains');

// In-memory store for OAuth credentials (replace with DB in production)
const credentials = {}; // key: userId_platform

function getPlatformByDomain(domain) {
  for (const [platform, domains] of Object.entries(platformDomains)) {
    if (domains.includes(domain)) {
      return platform;
    }
  }
  return null;
}

async function getCredential(userId, platform) {
  const key = `${userId}_${platform}`;
  return credentials[key] || null;
}

async function saveCredential(userId, platform, username, accessToken) {
  const key = `${userId}_${platform}`;
  credentials[key] = { username, accessToken };
}

module.exports = { getPlatformByDomain, getCredential, saveCredential };