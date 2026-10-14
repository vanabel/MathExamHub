/**
 * @param {string | null | undefined} parentPath
 * @param {string} name
 */
function buildKnowledgePointPath(parentPath, name) {
  const segment = String(name).trim().replace(/\//g, '／');
  if (!segment) {
    throw new Error('知识点名称不能为空');
  }
  if (!parentPath) {
    return `/${segment}`;
  }
  const base = parentPath.endsWith('/') ? parentPath.slice(0, -1) : parentPath;
  return `${base}/${segment}`;
}

module.exports = {
  buildKnowledgePointPath,
};
