const router = require('express').Router();
const Announcement = require('../models/Announcement');
const { isAuthenticated } = require('../middleware/auth');
const { uploadAnnouncement, deletePhoto } = require('../middleware/upload');
const { getEffectiveStatus, buildDashboardFilter } = require('../utils/announcements');

function parseAnnouncementBody(body) {
  const data = {
    title: body.title,
    description: body.description,
    audience: body.audience,
    audienceTarget: body.audienceTarget || '',
    isPinned: body.isPinned === 'on',
    status: body.status || 'active',
    announcementDate: body.announcementDate || null,
    startDate: body.startDate || null,
    endDate: body.endDate || null
  };
  if (data.announcementDate) data.announcementDate = new Date(data.announcementDate);
  if (data.startDate) data.startDate = new Date(data.startDate);
  if (data.endDate) data.endDate = new Date(data.endDate);
  return data;
}

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const { search, audience, status } = req.query;
    const filter = {};
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (audience) filter.audience = audience;
    if (status) filter.status = status;

    const announcements = await Announcement.find(filter).sort({ isPinned: -1, startDate: -1 });

    res.render('announcements/index', {
      announcements: announcements.map(a => ({
        ...a.toObject(),
        effectiveStatus: getEffectiveStatus(a)
      })),
      search: search || '',
      audience: audience || '',
      status: status || '',
      activePage: 'announcements'
    });
  } catch (err) {
    console.error('Fetch announcements error:', err);
    req.session.error = 'Failed to load announcements.';
    res.redirect('/members');
  }
});

router.get('/create', isAuthenticated, (req, res) => {
  res.render('announcements/create', { activePage: 'announcements' });
});

router.post('/create', isAuthenticated, uploadAnnouncement.single('image'), async (req, res) => {
  try {
    const data = parseAnnouncementBody(req.body);
    data.createdBy = req.session.user.id;
    if (req.file) data.image = '/uploads/announcements/' + req.file.filename;
    const announcement = new Announcement(data);
    await announcement.save();
    req.session.success = 'Announcement created successfully!';
    res.redirect('/announcements');
  } catch (err) {
    console.error('Create announcement error:', err);
    req.session.error = err.message || 'Failed to create announcement.';
    res.redirect('/announcements/create');
  }
});

router.get('/:id/edit', isAuthenticated, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      req.session.error = 'Announcement not found.';
      return res.redirect('/announcements');
    }
    res.render('announcements/edit', { announcement, activePage: 'announcements' });
  } catch (err) {
    console.error('Edit announcement error:', err);
    req.session.error = 'Failed to load announcement.';
    res.redirect('/announcements');
  }
});

router.post('/:id/edit', isAuthenticated, uploadAnnouncement.single('image'), async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      req.session.error = 'Announcement not found.';
      return res.redirect('/announcements');
    }
    const updateData = parseAnnouncementBody(req.body);
    if (req.file) {
      if (announcement.image) deletePhoto(announcement.image);
      updateData.image = '/uploads/announcements/' + req.file.filename;
    }
    await Announcement.findByIdAndUpdate(req.params.id, updateData);
    req.session.success = 'Announcement updated successfully!';
    res.redirect('/announcements');
  } catch (err) {
    console.error('Update announcement error:', err);
    req.session.error = err.message || 'Failed to update announcement.';
    res.redirect(`/announcements/${req.params.id}/edit`);
  }
});

router.post('/:id/delete', isAuthenticated, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (announcement && announcement.image) deletePhoto(announcement.image);
    await Announcement.findByIdAndDelete(req.params.id);
    req.session.success = 'Announcement deleted successfully!';
    res.redirect('/announcements');
  } catch (err) {
    console.error('Delete announcement error:', err);
    req.session.error = 'Failed to delete announcement.';
    res.redirect('/announcements');
  }
});

router.post('/:id/status', isAuthenticated, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'expired', 'scheduled'].includes(status)) {
      req.session.error = 'Invalid status.';
      return res.redirect('/announcements');
    }
    await Announcement.findByIdAndUpdate(req.params.id, { status });
    req.session.success = `Announcement marked as ${status}.`;
    res.redirect('/announcements');
  } catch (err) {
    console.error('Status update error:', err);
    req.session.error = 'Failed to update status.';
    res.redirect('/announcements');
  }
});

module.exports = router;
module.exports.buildDashboardFilter = buildDashboardFilter;
