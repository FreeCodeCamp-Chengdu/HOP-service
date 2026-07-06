const gitUtility = require('git-utility');
const path = require('path');

/**
 * Upload files to a git repository using git-utility.
 * @param {string} authUrl - Authenticated git URL (with embedded credentials)
 * @param {string} tmpDir - Temporary directory containing the files to commit
 * @param {Array} fileEntries - Array of { path, content } objects (for reference)
 * @returns {Promise<Object>} - The commit result
 */
async function uploadToGit(authUrl, tmpDir, fileEntries) {
  // Initialize a new repository in tmpDir (if not already)
  await gitUtility.init(tmpDir);

  // Add all files (already written to tmpDir)
  await gitUtility.add(tmpDir, '.');

  // Commit
  const commitMessage = `Upload ${fileEntries.length} file(s) via HOP API`;
  const commitResult = await gitUtility.commit(tmpDir, commitMessage);

  // Push to remote
  const remoteName = 'origin';
  const branch = 'main'; // or detect from remote? Assume main for simplicity
  await gitUtility.addRemote(tmpDir, remoteName, authUrl);
  await gitUtility.push(tmpDir, remoteName, branch);

  return commitResult;
}

module.exports = { uploadToGit };
