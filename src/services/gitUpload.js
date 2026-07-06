const { exec } = require('child_process');
const path = require('path');
const fs = require('fs-extra');

/**
 * Upload files to a Git repository using git commands.
 * @param {string} repoURL - Authenticated Git URL (with credentials).
 * @param {string} sourceDir - Directory containing files to upload.
 * @param {string} commitMessage - Commit message.
 */
async function uploadToGit(repoURL, sourceDir, commitMessage) {
  const repoName = path.basename(repoURL, '.git');
  const cloneDir = path.join(sourceDir, `_clone_${Date.now()}`);

  try {
    // Clone the repository (shallow, depth 1)
    await execAsync(`git clone --depth 1 ${repoURL} ${cloneDir}`);

    // Copy files from sourceDir to cloneDir (overwrite)
    await fs.copy(sourceDir, cloneDir, { overwrite: true });

    // Change to clone directory, add, commit, push
    const commands = [
      `cd ${cloneDir}`,
      'git add -A',
      `git commit -m "${commitMessage.replace(/"/g, '\\"')}"`,
      'git push'
    ];
    await execAsync(commands.join(' && '));

    // Clean up clone
    await fs.remove(cloneDir);
  } catch (err) {
    // Ensure cleanup on failure
    if (await fs.pathExists(cloneDir)) {
      await fs.remove(cloneDir).catch(() => {});
    }
    throw new Error(`Git upload failed: ${err.message}`);
  }
}

function execAsync(command) {
  return new Promise((resolve, reject) => {
    exec(command, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || stdout || error.message));
      } else {
        resolve(stdout);
      }
    });
  });
}

module.exports = { uploadToGit };
