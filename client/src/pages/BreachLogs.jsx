import { useEffect, useState } from 'react';
import { HiOutlineTrash } from 'react-icons/hi2';
import { getBreaches, clearBreaches } from '../services/api';

const identityLabels = { ip: 'IP Address', domain: 'Domain', user: 'User' };
const periodLabels = { minute: 'Per Minute', hour: 'Per Hour', day: 'Per Day' };

export default function BreachLogs() {
  const [breaches, setBreaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [toast, setToast] = useState(null);

  const fetchBreaches = async () => {
    try {
      const params = {};
      if (filter) params.identityType = filter;
      const res = await getBreaches(params);
      setBreaches(res.data);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBreaches();
  }, [filter]);

  const handleClear = async () => {
    if (!window.confirm('Clear all breach logs?')) return;
    try {
      await clearBreaches();
      setBreaches([]);
      setToast({ message: 'Breach logs cleared', type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch {
      setToast({ message: 'Failed to clear logs', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleString();
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
          <h2>Breach Logs</h2>
          <p>History of rate-limit violations</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select
            className="form-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ width: '160px' }}
          >
            <option value="">All Types</option>
            <option value="ip">IP Address</option>
            <option value="domain">Domain</option>
            <option value="user">User</option>
          </select>
          {breaches.length > 0 && (
            <button className="btn btn-danger btn-sm" onClick={handleClear}>
              <HiOutlineTrash /> Clear All
            </button>
          )}
        </div>
      </div>

      <div className="card">
        {breaches.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✅</div>
            <h3>No Breaches</h3>
            <p>No rate-limit violations have been recorded yet.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Rule</th>
                  <th>Identity Type</th>
                  <th>Identity</th>
                  <th>Period</th>
                  <th>Limit</th>
                  <th>Actual</th>
                </tr>
              </thead>
              <tbody>
                {breaches.map((breach) => (
                  <tr key={breach._id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {formatDate(breach.timestamp)}
                    </td>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {breach.ruleName}
                    </td>
                    <td>
                      <span className={`badge badge-${breach.identityType}`}>
                        {identityLabels[breach.identityType]}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                      {breach.identityValue}
                    </td>
                    <td>
                      <span className={`badge badge-${breach.period}`}>
                        {periodLabels[breach.period]}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{breach.maxRequests}</td>
                    <td>
                      <span className="badge badge-breach">
                        {breach.actualCount}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>{toast.message}</div>
        </div>
      )}
    </div>
  );
}
