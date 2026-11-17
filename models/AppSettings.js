const mongoose = require('mongoose');

const appSettingsSchema = new mongoose.Schema({
  birthdayNotificationsEnabled: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('AppSettings', appSettingsSchema);
