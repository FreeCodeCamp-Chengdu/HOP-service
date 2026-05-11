export const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const hasGitSegment = (rel: string): boolean =>
    rel.split(/[\\/]/).some(seg => seg === '.git');

/**
 * Builds the repo-URL policy pattern for a given platform domain.
 * Accepts:  domain/owner/repo   and   domain/owner/repo.git
 * Rejects:  domain/owner/repoXgit  (any suffix ending in 'git' that isn't '.git')
 *           empty owner/repo segments, nested paths, lookalike domains.
 */
export const buildRepoPattern = (domain: string): RegExp =>
    new RegExp(`^${escapeRegExp(domain)}/[^/]+/(?:[^/]+\\.git|[^/]+(?<!git))$`);
