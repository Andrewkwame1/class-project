const router = require('express').Router();
const User = require('../models/User');
const { isAuthenticated } = require('../middleware/auth');
const { uploadAvatar, deletePhoto } = require('../middleware/upload');

// GET settings page
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id).select('-password');
    res.render('settings', { user });
  } catch (err) {
    console.error('Settings error:', err);
    req.session.error = 'Failed to load settings.';
    res.redirect('/members');
  }
});

// POST update profile
router.post('/profile', isAuthenticated, uploadAvatar.single('profileImage'), async (req, res) => {
  try {
    const { fullName, email, phone } = req.body;
    
    // Find the user first to check if they have an old image
    const user = await User.findById(req.session.user.id);
    
    const updateData = { fullName, email, phone };
    
    if (req.file) {
      updateData.profileImage = `/uploads/avatars/${req.file.filename}`;
      
      // Delete old avatar if it exists
      if (user.profileImage) {
        deletePhoto(user.profileImage);
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.session.user.id,
      updateData,
      { returnDocument: 'after' }
    );

    // Update session
    req.session.user.fullName = updatedUser.fullName;
    req.session.user.email = updatedUser.email;
    req.session.user.phone = updatedUser.phone;
    req.session.user.profileImage = updatedUser.profileImage;

    req.session.success = 'Profile updated successfully!';
    res.redirect('/settings');
  } catch (err) {
    console.error('Update profile error:', err);
    req.session.error = err.message || 'Failed to update profile.';
    res.redirect('/settings');
  }
});

// POST change password
router.post('/password', isAuthenticated, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
      req.session.error = 'New passwords do not match.';
      return res.redirect('/settings');
    }

    if (newPassword.length < 4) {
      req.session.error = 'Password must be at least 4 characters.';
      return res.redirect('/settings');
    }

    const user = await User.findById(req.session.user.id);
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      req.session.error = 'Current password is incorrect.';
      return res.redirect('/settings');
    }

    user.password = newPassword;
    await user.save();

    req.session.success = 'Password changed successfully!';
    res.redirect('/settings');
  } catch (err) {
    console.error('Change password error:', err);
    req.session.error = 'Failed to change password.';
    res.redirect('/settings');
  }
});

module.exports = router;