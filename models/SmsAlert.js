const mongoose = require('mongoose');

const smsAlertSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true },
  audience: {
    type: String,
    enum: ['Entire church', 'Men', 'Women', 'Youth', 'Children', 'Department', 'Branch'],
    default: 'Entire church'
  },
  audienceTarget: { type: String, default: '' },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'sent'],
    default: 'draft'
  },
  scheduledDate: { type: Date, default: null },
  sentAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('SmsAlert', smsAlertSchema);
