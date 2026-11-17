const router = require('express').Router();
const Visitor = require('../models/Visitor');
const { isAuthenticated } = require('../middleware/auth');

// GET create visitor form
router.get('/create', isAuthenticated, (req, res) => {
  res.render('visitors/create', { activePage: 'visitor-create' });
});

// POST create visitor
router.post('/create', isAuthenticated, async (req, res) => {
  try {
    const visitor = new Visitor({
      ...req.body,
      createdBy: req.session.user.id
    });
    await visitor.save();
    req.session.success = 'Visitor registered successfully!';
    res.redirect('/visitors/create'); // redirect back to form or maybe a list
  } catch (err) {
    console.error('Register visitor error:', err);
    req.session.error = 'Failed to register visitor.';
    res.redirect('/visitors/create');
  }
});

module.exports = router;
