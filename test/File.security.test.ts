/**
 * Unit tests for upload-path validation and repo-URL regex logic.
 * Imports the exported helpers from file-validation.ts — no local duplicates.
 */

import { buildRepoPattern, hasGitSegment } from '../source/controller/file-validation';

describe('Upload path validation — .git segment blocking', () => {
    it('rejects bare .git', () => {
        expect(hasGitSegment('.git')).toBe(true);
    });

    it('rejects .git/config', () => {
        expect(hasGitSegment('.git/config')).toBe(true);
    });

    it('rejects nested dir/.git/config', () => {
        expect(hasGitSegment('dir/.git/config')).toBe(true);
    });

    it('accepts normal file paths', () => {
        expect(hasGitSegment('src/index.ts')).toBe(false);
    });

    it('accepts paths that contain .git as a substring but not a full segment', () => {
        expect(hasGitSegment('notgit/file.ts')).toBe(false);
    });
});

describe('Repo URL regex — github.com', () => {
    const pattern = buildRepoPattern('github.com');

    it('accepts owner/repo', () => {
        expect(pattern.test('github.com/owner/repo')).toBe(true);
    });

    it('accepts owner/repo.git', () => {
        expect(pattern.test('github.com/owner/repo.git')).toBe(true);
    });

    it('rejects lookalike domain github.com.evil/owner/repo', () => {
        expect(pattern.test('github.com.evil/owner/repo')).toBe(false);
    });

    it('rejects repoXgit (suffix ending in git that is not .git)', () => {
        expect(pattern.test('github.com/owner/repoXgit')).toBe(false);
    });

    it('rejects repogit (bare git suffix without dot)', () => {
        expect(pattern.test('github.com/owner/repogit')).toBe(false);
    });

    it('rejects empty owner segment', () => {
        expect(pattern.test('github.com//repo')).toBe(false);
    });

    it('rejects empty repo segment', () => {
        expect(pattern.test('github.com/owner/')).toBe(false);
    });

    it('rejects URL with extra path segments', () => {
        expect(pattern.test('github.com/owner/repo/extra')).toBe(false);
    });
});
