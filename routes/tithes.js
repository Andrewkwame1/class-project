const router = require('express').Router();
const Tithe = require('../models/Tithe');
const Member = require('../models/Member');
const { isAuthenticated } = require('../middleware/auth');

const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function emptyMonths() {
  return MONTH_KEYS.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});
}

function parseMonths(body) {
  const months = emptyMonths();
  MONTH_KEYS.forEach((key) => {
    const raw = body[key];
    const value = raw === '' || raw === undefined || raw === null ? 0 : Number(raw);
    months[key] = Number.isFinite(value) && value >= 0 ? value : 0;
  });
  return months;
}

function monthsTotal(months) {
  return MONTH_KEYS.reduce((sum, key) => sum + (Number(months[key]) || 0), 0);
}

function availableYears(currentYear) {
  const years = [];
  for (let year = currentYear + 1; year >= currentYear - 10; year -= 1) {
    years.push(year);
  }
  return years;
}

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const year = parseInt(req.query.year, 10) || currentYear;
    const { search, department } = req.query;

    const memberFilter = {};
    if (search) {
      memberFilter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { family: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    if (department) {
      memberFilter.department = { $regex: department, $options: 'i' };
    }

    const members = await Member.find(memberFilter).sort({ lastName: 1, firstName: 1 });
    const tithes = await Tithe.find({ year, member: { $in: members.map((m) => m._id) } });
    const titheByMember = new Map(tithes.map((t) => [String(t.member), t]));

    const rows = members.map((member) => {
      const record = titheByMember.get(String(member._id));
      const months = record ? record.toObject().months : emptyMonths();
      return {
        member,
        months,
        total: monthsTotal(months),
        hasRecord: Boolean(record)
      };
    });

    const yearTotal = rows.reduce((sum, row) => sum + row.total, 0);

    res.render('tithes/index', {
      rows,
      year,
      years: availableYears(currentYear),
      search: search || '',
      department: department || '',
      monthKeys: MONTH_KEYS,
      monthLabels: MONTH_LABELS,
      yearTotal,
      activePage: 'tithes'
    });
  } catch (err) {
    console.error('Fetch tithes error:', err);
    req.session.error = 'Failed to load tithes.';
    res.redirect('/members');
  }
});

router.get('/record', isAuthenticated, async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const year = parseInt(req.query.year, 10) || currentYear;
    const members = await Member.find().sort({ lastName: 1, firstName: 1 });

    let selectedMember = null;
    let months = emptyMonths();

    if (req.query.member) {
      selectedMember = await Member.findById(req.query.member);
      if (!selectedMember) {
        req.session.error = 'Member not found.';
        return res.redirect('/tithes');
      }
      const record = await Tithe.findOne({ member: selectedMember._id, year });
      if (record) months = record.toObject().months;
    }

    res.render('tithes/record', {
      members,
      selectedMember,
      year,
      years: availableYears(currentYear),
      months,
      monthKeys: MONTH_KEYS,
      monthLabels: MONTH_LABELS,
      activePage: 'tithes'
    });
  } catch (err) {
    console.error('Load tithe form error:', err);
    req.session.error = 'Failed to load tithe form.';
    res.redirect('/tithes');
  }
});

router.post('/record', isAuthenticated, async (req, res) => {
  try {
    const { memberId, year: yearRaw, family } = req.body;
    const year = parseInt(yearRaw, 10);

    if (!memberId || !year) {
      req.session.error = 'Member and year are required.';
      return res.redirect('/tithes/record');
    }

    const member = await Member.findById(memberId);
    if (!member) {
      req.session.error = 'Member not found.';
      return res.redirect('/tithes/record');
    }

    if (family !== undefined) {
      member.family = String(family).trim();
      await member.save();
    }

    const months = parseMonths(req.body);
    await Tithe.findOneAndUpdate(
      { member: member._id, year },
      {
        $set: { months, year, member: member._id },
        $setOnInsert: { createdBy: req.session.user.id }
      },
      { upsert: true, returnDocument: 'after' }
    );

    req.session.success = `Tithe recorded for ${member.firstName} ${member.lastName} (${year}).`;
    res.redirect(`/tithes?year=${year}`);
  } catch (err) {
    console.error('Save tithe error:', err);
    req.session.error = err.message || 'Failed to save tithe.';
    res.redirect('/tithes/record');
  }
});

router.post('/delete', isAuthenticated, async (req, res) => {
  try {
    const { memberId, year: yearRaw } = req.body;
    const year = parseInt(yearRaw, 10) || new Date().getFullYear();
    await Tithe.findOneAndDelete({ member: memberId, year });
    req.session.success = 'Tithe record deleted.';
    res.redirect(`/tithes?year=${year}`);
  } catch (err) {
    console.error('Delete tithe error:', err);
    req.session.error = 'Failed to delete tithe record.';
    res.redirect('/tithes');
  }
});

module.exports = router;
