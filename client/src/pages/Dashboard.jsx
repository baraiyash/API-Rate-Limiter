import { useEffect, useState } from 'react';
import {
  HiOutlineShieldCheck,
  HiOutlineBolt,
  HiOutlineExclamationTriangle,
  HiOutlineBell,
} from 'react-icons/hi2';
import { getStats } from '../services/api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await getStats();
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="page-content">
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Active Rules',
      value: stats?.activeRules ?? 0,
      icon: HiOutlineShieldCheck,
      variant: 'primary',
    },
    {
      label: 'Total Rules',
      value: stats?.totalRules ?? 0,
      icon: HiOutlineBolt,
      variant: 'success',
    },
    {
      label: 'Breaches Today',
      value: stats?.breachesToday ?? 0,
      icon: HiOutlineExclamationTriangle,
      variant: 'danger',
    },
    {
      label: 'Unread Alerts',
      value: stats?.unreadNotifications ?? 0,
      icon: HiOutlineBell,
      variant: 'warning',
    },
  ];

  // Build chart data from recent breaches
  const chartData = stats?.recentBreaches || [];
  const maxCount = Math.max(...chartData.map((d) => d.count), 1);

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>Overview of your API rate limiting system</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {statCards.map((card) => (
          <div key={card.label} className={`stat-card ${card.variant}`}>
            <div className={`stat-icon ${card.variant}`}>
              <card.icon />
            </div>
            <div className="stat-info">
              <h3>{card.value}</h3>
              <p>{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Breach Activity Chart */}
      <div className="card">
        <div className="card-header">
          <h2>Breach Activity (Last 24 Hours)</h2>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {stats?.totalBreaches ?? 0} total breaches
          </span>
        </div>
        <div className="chart-container">
          {chartData.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <p>No breaches recorded in the last 24 hours</p>
            </div>
          ) : (
            <div className="chart-bars">
              {chartData.map((item, i) => (
                <div key={i} className="chart-bar-wrapper">
                  <span className="chart-bar-value">{item.count}</span>
                  <div
                    className="chart-bar"
                    style={{
                      height: `${(item.count / maxCount) * 120}px`,
                    }}
                    title={`${item._id}: ${item.count} breaches`}
                  ></div>
                  <span className="chart-bar-label">
                    {item._id.split(' ')[1] || item._id}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
