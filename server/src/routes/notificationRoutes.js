/**
 * Notification Routes — Admin notification management.
 */

const express = require('express');
const mongoose = require('mongoose');
const Notification = require('../models/Notification');

const router = express.Router();

/**
 * GET /api/notifications
 * List notifications, optionally filtered by read status.
 * Query params: read (true/false), limit (default 50)
 */
router.get('/', async (req, res) => {
  try {
    const filter = {};

    if (req.query.read !== undefined) {
      filter.read = req.query.read === 'true';
    }

    const limit = parseInt(req.query.limit, 10) || 50;

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit);

    // Also return unread count
    const unreadCount = await Notification.countDocuments({ read: false });

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('[NOTIFICATIONS] GET error:', error.message);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read.
 */
router.patch('/:id/read', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }

    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(notification);
  } catch (error) {
    console.error('[NOTIFICATIONS] PATCH error:', error.message);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read.
 */
router.patch('/read-all', async (req, res) => {
  try {
    await Notification.updateMany({ read: false }, { read: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('[NOTIFICATIONS] PATCH read-all error:', error.message);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

module.exports = router;
