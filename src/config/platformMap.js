// Mapping from platform enumeration (lowercase) to primary domain
const platformMap = {
  github: 'github.com',
  gitlab: 'gitlab.com',
  bitbucket: 'bitbucket.org'
};

// Additionally, support self-hosted by looking at host? Not implemented.
// The map is used to identify platform from git URL.

module.exports = platformMap;
