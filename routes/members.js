const router = require('express').Router();
const Member = require('../models/Member');
const Announcement = require('../models/Announcement');
const Tithe = require('../models/Tithe');
const { isAuthenticated } = require('../middleware/auth');
const { upload, deletePhoto } = require('../middleware/upload');
const { buildDashboardFilter, getEffectiveStatus } = require('../utils/announcements');

async function getDashboardAnnouncements() {
  const filter = buildDashboardFilter();
  const announcements = await Announcement.find(filter)
    .sort({ isPinned: -1, startDate: -1 })
    .limit(6);
  return announcements.filter(a => getEffectiveStatus(a) === 'active');
}

function applyPhotoUpdate(updateData, req, existingPhoto) {
  if (req.body.removePhoto === '1') {
    if (existingPhoto) deletePhoto(existingPhoto);
    updateData.photo = '';
  }
  if (req.file) {
    if (existingPhoto) deletePhoto(existingPhoto);
    updateData.photo = '/uploads/members/' + req.file.filename;
  }
}

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const { search, department, page = 1 } = req.query;
    const limit = 10;
    const skip = (parseInt(page) - 1) * limit;

    const filter = {};
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    if (department) {
      filter.department = { $regex: department, $options: 'i' };
    }

    const total = await Member.countDocuments(filter);
    const members = await Member.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const dashboardAnnouncements = await getDashboardAnnouncements();

    res.render('members/index', {
      members,
      dashboardAnnouncements,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      search: search || '',
      department: department || ''
    });
  } catch (err) {
    console.error('Fetch members error:', err);
    req.session.error = 'Failed to load members.';
    res.render('members/index', {
      members: [],
      dashboardAnnouncements: [],
      currentPage: 1,
      totalPages: 0,
      search: '',
      department: ''
    });
  }
});

router.get('/create', isAuthenticated, (req, res) => {
  res.render('members/create');
});

router.post('/create', isAuthenticated, upload.single('photo'), async (req, res) => {
  try {
    const memberData = { ...req.body, createdBy: req.session.user.id };
    if (!memberData.dateOfBirth) delete memberData.dateOfBirth;
    if (!memberData.baptismDate) delete memberData.baptismDate;
    if (req.file) {
      memberData.photo = '/uploads/members/' + req.file.filename;
    }
    const member = new Member(memberData);
    await member.save();
    req.session.success = 'Member added successfully!';
    res.redirect('/members');
  } catch (err) {
    console.error('Create member error:', err);
    if (req.file) deletePhoto('/uploads/members/' + req.file.filename);
    req.session.error = err.message || 'Failed to create member.';
    res.redirect('/members/create');
  }
});

router.get('/:id/edit', isAuthenticated, async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      req.session.error = 'Member not found.';
      return res.redirect('/members');
    }
    res.render('members/edit', { member });
  } catch (err) {
    console.error('Edit member error:', err);
    req.session.error = 'Failed to load member.';
    res.redirect('/members');
  }
});

router.post('/:id/edit', isAuthenticated, upload.single('photo'), async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      req.session.error = 'Member not found.';
      return res.redirect('/members');
    }
    const updateData = { ...req.body };
    if (!updateData.dateOfBirth) updateData.dateOfBirth = null;
    if (!updateData.baptismDate) updateData.baptismDate = null;
    applyPhotoUpdate(updateData, req, member.photo);
    await Member.findByIdAndUpdate(req.params.id, updateData);
    req.session.success = 'Member updated successfully!';
    res.redirect('/members/' + req.params.id);
  } catch (err) {
    console.error('Update member error:', err);
    req.session.error = err.message || 'Failed to update member.';
    res.redirect(`/members/${req.params.id}/edit`);
  }
});

router.post('/:id/photo', isAuthenticated, upload.single('photo'), async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      req.session.error = 'Member not found.';
      return res.redirect('/members');
    }
    if (req.body.removePhoto === '1') {
      if (member.photo) deletePhoto(member.photo);
      await Member.findByIdAndUpdate(req.params.id, { photo: '' });
      req.session.success = 'Member photo removed.';
    } else if (req.file) {
      if (member.photo) deletePhoto(member.photo);
      await Member.findByIdAndUpdate(req.params.id, {
        photo: '/uploads/members/' + req.file.filename
      });
      req.session.success = 'Member photo updated!';
    } else {
      req.session.error = 'Please choose an image to upload.';
    }
    res.redirect('/members/' + req.params.id);
  } catch (err) {
    console.error('Photo update error:', err);
    req.session.error = err.message || 'Failed to update photo.';
    res.redirect('/members/' + req.params.id);
  }
});

router.post('/:id/delete', isAuthenticated, async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (member && member.photo) deletePhoto(member.photo);
    if (member) await Tithe.deleteMany({ member: member._id });
    await Member.findByIdAndDelete(req.params.id);
    req.session.success = 'Member deleted successfully!';
    res.redirect('/members');
  } catch (err) {
    console.error('Delete member error:', err);
    req.session.error = 'Failed to delete member.';
    res.redirect('/members');
  }
});

router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      req.session.error = 'Member not found.';
      return res.redirect('/members');
    }
    res.render('members/view', { member });
  } catch (err) {
    console.error('View member error:', err);
    req.session.error = 'Failed to load member.';
    res.redirect('/members');
  }
});

module.exports = router;
