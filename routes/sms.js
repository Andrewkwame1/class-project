const router = require('express').Router();
const SmsAlert = require('../models/SmsAlert');
const { isAuthenticated } = require('../middleware/auth');

function parseSmsBody(body) {
  const data = {
    title: body.title,
    message: body.message,
    audience: body.audience,
    audienceTarget: body.audienceTarget || '',
    status: body.status || 'draft'
  };
  if (body.scheduledDate) data.scheduledDate = new Date(body.scheduledDate);
  return data;
}

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const { search, audience, status } = req.query;
    const filter = {};
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } }
      ];
    }
    if (audience) filter.audience = audience;
    if (status) filter.status = status;

    const alerts = await SmsAlert.find(filter).sort({ createdAt: -1 });

    res.render('sms/index', {
      alerts,
      search: search || '',
      audience: audience || '',
      status: status || '',
      activePage: 'sms'
    });
  } catch (err) {
    console.error('Fetch SMS alerts error:', err);
    req.session.error = 'Failed to load SMS alerts.';
    res.redirect('/members');
  }
});

router.get('/create', isAuthenticated, (req, res) => {
  res.render('sms/create', { activePage: 'sms' });
});

router.post('/create', isAuthenticated, async (req, res) => {
  try {
    const data = parseSmsBody(req.body);
    data.createdBy = req.session.user.id;
    const alert = new SmsAlert(data);
    await alert.save();
    req.session.success = 'SMS alert created successfully!';
    res.redirect('/sms');
  } catch (err) {
    console.error('Create SMS error:', err);
    req.session.error = 'Failed to create SMS alert.';
    res.redirect('/sms/create');
  }
});

router.get('/:id/edit', isAuthenticated, async (req, res) => {
  try {
    const alert = await SmsAlert.findById(req.params.id);
    if (!alert) {
      req.session.error = 'SMS alert not found.';
      return res.redirect('/sms');
    }
    res.render('sms/edit', { alert, activePage: 'sms' });
  } catch (err) {
    console.error('Edit SMS error:', err);
    req.session.error = 'Failed to load SMS alert.';
    res.redirect('/sms');
  }
});

router.post('/:id/edit', isAuthenticated, async (req, res) => {
  try {
    const updateData = parseSmsBody(req.body);
    await SmsAlert.findByIdAndUpdate(req.params.id, updateData);
    req.session.success = 'SMS alert updated successfully!';
    res.redirect('/sms');
  } catch (err) {
    console.error('Update SMS error:', err);
    req.session.error = 'Failed to update SMS alert.';
    res.redirect(`/sms/${req.params.id}/edit`);
  }
});

router.post('/:id/delete', isAuthenticated, async (req, res) => {
  try {
    await SmsAlert.findByIdAndDelete(req.params.id);
    req.session.success = 'SMS alert deleted successfully!';
    res.redirect('/sms');
  } catch (err) {
    console.error('Delete SMS error:', err);
    req.session.error = 'Failed to delete SMS alert.';
    res.redirect('/sms');
  }
});

router.post('/:id/send', isAuthenticated, async (req, res) => {
  try {
    await SmsAlert.findByIdAndUpdate(req.params.id, {
      status: 'sent',
      sentAt: new Date()
    });
    req.session.success = 'SMS alert marked as sent! (Integrate SMS gateway to deliver messages.)';
    res.redirect('/sms');
  } catch (err) {
    console.error('Send SMS error:', err);
    req.session.error = 'Failed to send SMS alert.';
    res.redirect('/sms');
  }
});

module.exports = router;
