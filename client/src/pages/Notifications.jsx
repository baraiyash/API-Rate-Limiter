import { useEffect, useState } from 'react';
import { HiOutlineCheckCircle } from 'react-icons/hi2';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../services/api';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await getNotifications();
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      fetchNotifications();
    } catch {
      // Silent
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      fetchNotifications();
    } catch {
      // Silent
    }
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <div className="page-content">
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h2>Notifications</h2>
          <p>
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
              : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-secondary" onClick={handleMarkAllRead}>
            <HiOutlineCheckCircle /> Mark All Read
          </button>
        )}
      </div>

      <div className="card">
        {notifications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔔</div>
            <h3>No Notifications</h3>
            <p>You'll receive notifications here when rate limits are breached.</p>
          </div>
        ) : (
          <div>
            {notifications.map((notif) => (
              <div
                key={notif._id}
                className={`notification-item ${!notif.read ? 'unread' : ''}`}
                onClick={() => !notif.read && handleMarkRead(notif._id)}
              >
                {!notif.read && <div className="notification-dot"></div>}
                <div className="notification-content" style={{ flex: 1 }}>
                  <h4>{notif.title}</h4>
                  <p>{notif.message}</p>
                </div>
                <span className="notification-time">
                  {timeAgo(notif.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
