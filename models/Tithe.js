const mongoose = require('mongoose');

const monthAmount = { type: Number, default: 0, min: 0 };

const titheSchema = new mongoose.Schema({
  member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true
  },
  year: {
    type: Number,
    required: true,
    min: 2000
  },
  months: {
    jan: monthAmount,
    feb: monthAmount,
    mar: monthAmount,
    apr: monthAmount,
    may: monthAmount,
    jun: monthAmount,
    jul: monthAmount,
    aug: monthAmount,
    sep: monthAmount,
    oct: monthAmount,
    nov: monthAmount,
    dec: monthAmount
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

titheSchema.index({ member: 1, year: 1 }, { unique: true });

titheSchema.methods.yearTotal = function () {
  return Object.values(this.months.toObject ? this.months.toObject() : this.months)
    .reduce((sum, amount) => sum + (Number(amount) || 0), 0);
};

module.exports = mongoose.model('Tithe', titheSchema);
