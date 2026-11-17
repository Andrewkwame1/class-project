const mongoose = require('mongoose');

const devotionalSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  bibleVerse: { type: String, default: '', trim: true },
  scriptureText: { type: String, default: '' },
  message: { type: String, required: true },
  prayer: { type: String, default: '' },
  reflectionQuestion: { type: String, default: '' },
  author: { type: String, default: '', trim: true },
  publicationDate: { type: Date, default: Date.now },
  scheduledDate: { type: Date, default: null },
  isPublished: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Devotional', devotionalSchema);
