const router = require('express').Router();
const Devotional = require('../models/Devotional');
const { isAuthenticated } = require('../middleware/auth');

function parseDevotionalBody(body) {
  const data = {
    title: body.title,
    bibleVerse: body.bibleVerse || '',
    scriptureText: body.scriptureText || '',
    message: body.message,
    prayer: body.prayer || '',
    reflectionQuestion: body.reflectionQuestion || '',
    author: body.author || '',
    isPublished: body.isPublished === 'on'
  };
  if (body.publicationDate) data.publicationDate = new Date(body.publicationDate);
  if (body.scheduledDate) data.scheduledDate = new Date(body.scheduledDate);
  return data;
}

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const { search, published } = req.query;
    const filter = {};
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { bibleVerse: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } }
      ];
    }
    if (published === 'yes') filter.isPublished = true;
    if (published === 'no') filter.isPublished = false;

    const devotionals = await Devotional.find(filter).sort({ publicationDate: -1 });

    res.render('devotionals/index', {
      devotionals,
      search: search || '',
      published: published || '',
      activePage: 'devotionals'
    });
  } catch (err) {
    console.error('Fetch devotionals error:', err);
    req.session.error = 'Failed to load devotionals.';
    res.redirect('/members');
  }
});

router.get('/create', isAuthenticated, (req, res) => {
  res.render('devotionals/create', { activePage: 'devotionals' });
});

router.post('/create', isAuthenticated, async (req, res) => {
  try {
    const data = parseDevotionalBody(req.body);
    data.createdBy = req.session.user.id;
    const devotional = new Devotional(data);
    await devotional.save();
    req.session.success = 'Devotional created successfully!';
    res.redirect('/devotionals');
  } catch (err) {
    console.error('Create devotional error:', err);
    req.session.error = 'Failed to create devotional.';
    res.redirect('/devotionals/create');
  }
});

router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const devotional = await Devotional.findById(req.params.id);
    if (!devotional) {
      req.session.error = 'Devotional not found.';
      return res.redirect('/devotionals');
    }
    res.render('devotionals/view', { devotional, activePage: 'devotionals' });
  } catch (err) {
    console.error('View devotional error:', err);
    req.session.error = 'Failed to load devotional.';
    res.redirect('/devotionals');
  }
});

router.get('/:id/edit', isAuthenticated, async (req, res) => {
  try {
    const devotional = await Devotional.findById(req.params.id);
    if (!devotional) {
      req.session.error = 'Devotional not found.';
      return res.redirect('/devotionals');
    }
    res.render('devotionals/edit', { devotional, activePage: 'devotionals' });
  } catch (err) {
    console.error('Edit devotional error:', err);
    req.session.error = 'Failed to load devotional.';
    res.redirect('/devotionals');
  }
});

router.post('/:id/edit', isAuthenticated, async (req, res) => {
  try {
    const updateData = parseDevotionalBody(req.body);
    await Devotional.findByIdAndUpdate(req.params.id, updateData);
    req.session.success = 'Devotional updated successfully!';
    res.redirect('/devotionals');
  } catch (err) {
    console.error('Update devotional error:', err);
    req.session.error = 'Failed to update devotional.';
    res.redirect(`/devotionals/${req.params.id}/edit`);
  }
});

router.post('/:id/delete', isAuthenticated, async (req, res) => {
  try {
    await Devotional.findByIdAndDelete(req.params.id);
    req.session.success = 'Devotional deleted successfully!';
    res.redirect('/devotionals');
  } catch (err) {
    console.error('Delete devotional error:', err);
    req.session.error = 'Failed to delete devotional.';
    res.redirect('/devotionals');
  }
});

router.post('/:id/publish', isAuthenticated, async (req, res) => {
  try {
    const { action } = req.body;
    await Devotional.findByIdAndUpdate(req.params.id, { isPublished: action === 'publish' });
    req.session.success = action === 'publish' ? 'Devotional published!' : 'Devotional unpublished.';
    res.redirect('/devotionals');
  } catch (err) {
    console.error('Publish error:', err);
    req.session.error = 'Failed to update publish status.';
    res.redirect('/devotionals');
  }
});

module.exports = router;
