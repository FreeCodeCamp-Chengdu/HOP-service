const simpleGit = require('simple-git');
const path = require('path');

async function clone(url, destDir) {
  const git = simpleGit();
  await git.clone(url, destDir);
}

async function commitAndPush(repoPath, commitMessage) {
  const git = simpleGit(repoPath);
  await git.add('./*');
  await git.commit(commitMessage);
  await git.push('origin', 'master');
}

module.exports = { clone, commitAndPush };