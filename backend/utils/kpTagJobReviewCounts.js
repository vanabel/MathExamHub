function countReviewRows(rows) {
  const counts = { pending: 0, accepted: 0, rejected: 0, edited: 0 };
  for (const row of rows || []) {
    const st = row.status || 'pending';
    if (counts[st] != null) counts[st] += 1;
    else counts.pending += 1;
  }
  return counts;
}

function isJobReviewOpen(job) {
  if (!job || job.appliedAt || job.dismissedAt) return false;
  if (job.status === 'queued' || job.status === 'running') return true;
  if (job.status === 'completed') return true;
  return false;
}

function jobListCategory(job) {
  if (job.dismissedAt) return 'dismissed';
  if (job.appliedAt) return 'applied';
  const pending = job.reviewCounts?.pending ?? countReviewRows(job.rows).pending;
  if (isJobReviewOpen(job) && pending > 0) return 'pending';
  return 'other';
}

module.exports = {
  countReviewRows,
  isJobReviewOpen,
  jobListCategory,
};
