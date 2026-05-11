export const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const hasGitSegment = (rel: string): boolean =>
    rel.split(/[\\/]/).some(seg => seg === '.git');

/**
 * Builds the repo-URL policy pattern for a given platform domain.
 * Accepts:  domain/owner/repo   and   domain/owner/repo.git
 *           Repo names that naturally end in "git" (e.g. "legit", "digit") are
 *           valid — the URL is fully anchored so no lookalike attack is possible.
 * Rejects:  empty owner/repo segments, nested paths, lookalike domains.
 */
export const buildRepoPattern = (domain: string): RegExp =>
    new RegExp(`^${escapeRegExp(domain)}/[^/]+/[^/]+(?:\\.git)?$`);
