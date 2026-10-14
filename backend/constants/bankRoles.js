const BANK_ROLES = ['owner', 'editor', 'viewer'];

const ROLE_RANK = {
  owner: 3,
  editor: 2,
  viewer: 1,
};

/**
 * @param {string} role
 * @param {string} minRole
 */
function hasMinRole(role, minRole) {
  return (ROLE_RANK[role] || 0) >= (ROLE_RANK[minRole] || 0);
}

module.exports = {
  BANK_ROLES,
  ROLE_RANK,
  hasMinRole,
};
