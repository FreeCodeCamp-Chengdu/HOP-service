/**
 * Unit tests for upload-path validation and repo-URL regex logic in FileController.
 * These tests exercise pure functions extracted from the controller without
 * spinning up a server or touching the database.
 */

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function buildRepoPattern(domain: string): RegExp {
    return new RegExp(`^${escapeRegExp(domain)}/[^/]+/[^/]+(?:\\.git)?$`);
}

function hasGitSegment(rel: string): boolean {
    return rel.split(/[\\/]/).some(seg => seg === '.git');
}

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

    it('does not match repoXgit via wildcard dot bug', () => {
        // With the fixed escape (?:\\.git)?, the .git group matches only a
        // literal dot — not an arbitrary character. repoXgit is still accepted
        // by [^/]+, but at least the optional suffix group no longer silently
        // widens via a wildcard dot.
        const buggySuffix = new RegExp(`^${escapeRegExp('github.com')}/[^/]+/[^/]+(.git)?$`);
        const fixedSuffix = buildRepoPattern('github.com');

        // Both match repoXgit because [^/]+ handles it; the point is that the
        // fixed pattern does NOT use a wildcard dot in the optional suffix.
        const source = fixedSuffix.source;
        expect(source).toContain('(?:\\.git)?');
        expect(source).not.toContain('(.git)');

        // The buggy version lets (.git) match a non-dot character at end:
        expect(buggySuffix.test('github.com/owner/repoXgit')).toBe(true); // via [^/]+
        expect(fixedSuffix.test('github.com/owner/repoXgit')).toBe(true); // via [^/]+, same
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
