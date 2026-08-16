const mongoose = require('mongoose');

const breachLogSchema = new mongoose.Schema({
  ruleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rule',
    required: true,
  },
  ruleName: {
    type: String,
    required: true,
  },
  identityType: {
    type: String,
    required: true,
    enum: ['ip', 'domain', 'user'],
  },
  identityValue: {
    type: String,
    required: true,
  },
  period: {
    type: String,
    required: true,
    enum: ['minute', 'hour', 'day'],
  },
  maxRequests: {
    type: Number,
    required: true,
  },
  actualCount: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  notified: {
    type: Boolean,
    default: false,
  },
});

// Index for querying breaches by date (dashboard stats)
breachLogSchema.index({ timestamp: -1 });
breachLogSchema.index({ ruleId: 1, identityValue: 1, timestamp: -1 });

module.exports = mongoose.model('BreachLog', breachLogSchema);
