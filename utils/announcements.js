function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getEffectiveStatus(announcement, now = new Date()) {
  const today = startOfDay(now);
  const start = announcement.startDate ? startOfDay(announcement.startDate) : null;
  const end = announcement.endDate ? startOfDay(announcement.endDate) : null;

  if (announcement.status === 'expired') return 'expired';
  if (end && end < today) return 'expired';
  if (start && start > today) return 'scheduled';
  return 'active';
}

function isVisibleOnDashboard(announcement, now = new Date()) {
  const status = getEffectiveStatus(announcement, now);
  return status === 'active';
}

function buildDashboardFilter() {
  const now = new Date();
  const today = startOfDay(now);
  return {
    status: { $ne: 'expired' },
    $and: [
      { $or: [{ startDate: null }, { startDate: { $lte: today } }] },
      { $or: [{ endDate: null }, { endDate: { $gte: today } }] }
    ]
  };
}

module.exports = { getEffectiveStatus, isVisibleOnDashboard, buildDashboardFilter, startOfDay };
