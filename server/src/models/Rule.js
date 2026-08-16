const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Rule name is required'],
      trim: true,
      maxlength: [100, 'Rule name cannot exceed 100 characters'],
    },
    identityType: {
      type: String,
      required: [true, 'Identity type is required'],
      enum: {
        values: ['ip', 'domain', 'user'],
        message: 'Identity type must be one of: ip, domain, user',
      },
    },
    period: {
      type: String,
      required: [true, 'Period is required'],
      enum: {
        values: ['minute', 'hour', 'day'],
        message: 'Period must be one of: minute, hour, day',
      },
    },
    maxRequests: {
      type: Number,
      required: [true, 'Max requests is required'],
      min: [0, 'Max requests cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Max requests must be an integer',
      },
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast lookup of active rules by identity type
ruleSchema.index({ active: 1, identityType: 1 });

module.exports = mongoose.model('Rule', ruleSchema);
