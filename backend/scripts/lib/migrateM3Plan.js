/**
 * Pure planning helpers for M3 bank binding (testable without Mongo writes).
 */

/**
 * @param {Array<{ _id: unknown, createdBy?: string }>} orphanQuestions
 * @param {Map<string, { _id: unknown, username: string }>} userByUsername
 * @param {{ _id: unknown, username?: string } | null} fallbackUser
 */
function planOrphanQuestionBindings(orphanQuestions, userByUsername, fallbackUser) {
  let bindToCreatedBy = 0;
  let bindToFallback = 0;
  let skipped = 0;

  for (const q of orphanQuestions) {
    let user = null;
    if (q.createdBy && userByUsername.has(q.createdBy)) {
      user = userByUsername.get(q.createdBy);
    }
    if (user) {
      bindToCreatedBy += 1;
      continue;
    }
    if (fallbackUser) {
      bindToFallback += 1;
      continue;
    }
    skipped += 1;
  }

  return {
    total: orphanQuestions.length,
    bindToCreatedBy,
    bindToFallback,
    skipped,
    fallbackUsername: fallbackUser?.username || null,
  };
}

/**
 * @param {string[]} argv
 */
function parseMigrateM3Args(argv) {
  const apply = argv.includes('--apply');
  const dryRun = !apply;
  const fallbackUserIdArg = argv.find((a) => a.startsWith('--fallback-user-id='));
  const fallbackUsernameArg = argv.find((a) => a.startsWith('--fallback-username='));
  return {
    dryRun,
    apply,
    fallbackUserId: fallbackUserIdArg ? fallbackUserIdArg.split('=').slice(1).join('=') : null,
    fallbackUsername: fallbackUsernameArg ? fallbackUsernameArg.split('=').slice(1).join('=') : null,
  };
}

module.exports = {
  planOrphanQuestionBindings,
  parseMigrateM3Args,
};
