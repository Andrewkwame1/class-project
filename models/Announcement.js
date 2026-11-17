const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  image: {
    type: String,
    default: ''
  },
  audience: {
    type: String,
    enum: ['Entire church', 'Men', 'Women', 'Youth', 'Children', 'Department', 'Branch'],
    default: 'Entire church'
  },
  audienceTarget: {
    type: String,
    default: ''
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'scheduled'],
    default: 'active'
  },
  announcementDate: {
    type: Date,
    default: null
  },
  startDate: {
    type: Date,
    default: null
  },
  endDate: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('Announcement', announcementSchema);
