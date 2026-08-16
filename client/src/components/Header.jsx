import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { HiOutlineBell } from 'react-icons/hi2';
import { getNotifications } from '../services/api';

const pageTitles = {
  '/': 'Dashboard',
  '/rules': 'Rate Limit Rules',
  '/breaches': 'Breach Logs',
  '/notifications': 'Notifications',
  '/test': 'Test API',
};

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = async () => {
    try {
      const res = await getNotifications({ read: 'false', limit: 1 });
      setUnreadCount(res.data.unreadCount || 0);
    } catch {
      // Silently fail — non-critical
    }
  };

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  const title = pageTitles[location.pathname] || 'API Rate Limiter';

  return (
    <header className="header">
      <div>
        <h1 className="header-title">{title}</h1>
      </div>

      <div className="header-actions">
        <button
          className="notification-bell"
          onClick={() => navigate('/notifications')}
          title="Notifications"
        >
          <HiOutlineBell />
          {unreadCount > 0 && (
            <span className="notification-badge">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
