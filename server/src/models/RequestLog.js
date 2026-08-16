const mongoose = require('mongoose');

const requestLogSchema = new mongoose.Schema({
  ruleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rule',
    required: true,
  },
  identityValue: {
    type: String,
    required: true,
  },
  windowStart: {
    type: Date,
    required: true,
  },
  count: {
    type: Number,
    default: 0,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
});

// Compound index for fast counter lookups
requestLogSchema.index(
  { ruleId: 1, identityValue: 1, windowStart: 1 },
  { unique: true }
);

// TTL index — MongoDB automatically deletes documents when expiresAt is reached
requestLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RequestLog', requestLogSchema);
