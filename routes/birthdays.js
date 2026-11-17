const router = require('express').Router();
const Member = require('../models/Member');
const AppSettings = require('../models/AppSettings');
const { isAuthenticated } = require('../middleware/auth');

async function getSettings() {
  let settings = await AppSettings.findOne();
  if (!settings) {
    settings = await AppSettings.create({ birthdayNotificationsEnabled: true });
  }
  return settings;
}

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const { search, department, branch, tab = 'today' } = req.query;
    const filter = { dateOfBirth: { $ne: null } };

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }
    if (department) filter.department = { $regex: department, $options: 'i' };
    if (branch) filter.branch = { $regex: branch, $options: 'i' };

    const members = await Member.find(filter);
    const settings = await getSettings();

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();

    const isThisWeek = (date) => {
      const bdayThisYear = new Date(today.getFullYear(), date.getMonth(), date.getDate());
      const diffTime = bdayThisYear - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    };

    const filteredMembers = members.filter(member => {
      const dob = new Date(member.dateOfBirth);
      const mMonth = dob.getMonth();
      const mDay = dob.getDate();

      switch (tab) {
        case 'today':
          return mMonth === currentMonth && mDay === currentDay;
        case 'week':
          return isThisWeek(dob);
        case 'month':
          return mMonth === currentMonth;
        case 'upcoming': {
          const bdayThisYear = new Date(today.getFullYear(), mMonth, mDay);
          if (bdayThisYear < today) bdayThisYear.setFullYear(today.getFullYear() + 1);
          const diffTime = bdayThisYear - today;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays >= 0 && diffDays <= 30;
        }
        default:
          return true;
      }
    });

    res.render('birthdays/index', {
      birthdays: filteredMembers,
      search: search || '',
      department: department || '',
      branch: branch || '',
      tab,
      notificationsEnabled: settings.birthdayNotificationsEnabled,
      activePage: 'birthdays'
    });
  } catch (err) {
    console.error('Fetch birthdays error:', err);
    req.session.error = 'Failed to load birthdays.';
    res.redirect('/members');
  }
});

router.post('/notifications', isAuthenticated, async (req, res) => {
  try {
    const enabled = req.body.enabled === 'on';
    let settings = await AppSettings.findOne();
    if (!settings) {
      settings = new AppSettings({ birthdayNotificationsEnabled: enabled });
    } else {
      settings.birthdayNotificationsEnabled = enabled;
    }
    await settings.save();
    req.session.success = enabled
      ? 'Birthday notifications enabled.'
      : 'Birthday notifications disabled.';
    res.redirect('/birthdays');
  } catch (err) {
    console.error('Notification settings error:', err);
    req.session.error = 'Failed to update notification settings.';
    res.redirect('/birthdays');
  }
});

module.exports = router;
