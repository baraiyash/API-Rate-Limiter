import { useEffect, useState } from 'react';
import {
  HiOutlinePlus,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineSparkles,
} from 'react-icons/hi2';
import {
  getRules,
  createRule,
  updateRule,
  deleteRule,
  seedDefaultRules,
} from '../services/api';
import RuleForm from '../components/RuleForm';

const identityLabels = { ip: 'IP Address', domain: 'Domain', user: 'User' };
const periodLabels = { minute: 'Per Minute', hour: 'Per Hour', day: 'Per Day' };

export default function Rules() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [toast, setToast] = useState(null);
  const [selectedIdentity, setSelectedIdentity] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');

  const fetchRules = async () => {
    try {
      const params = {};
      if (selectedIdentity) params.identityType = selectedIdentity;
      const res = await getRules(params);
      setRules(res.data);
    } catch (err) {
      showToast('Failed to fetch rules', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, [selectedIdentity]);

  const handleSeed = async () => {
    try {
      const res = await seedDefaultRules(false);
      showToast(res.data.message || '15 default rules loaded successfully');
      fetchRules();
    } catch {
      showToast('Failed to load default rules', 'error');
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCreate = async (data) => {
    try {
      await createRule(data);
      showToast('Rule created successfully');
      setShowForm(false);
      fetchRules();
    } catch (err) {
      const msg =
        err.response?.data?.details?.join(', ') ||
        err.response?.data?.error ||
        'Failed to create rule';
      showToast(msg, 'error');
    }
  };

  const handleUpdate = async (data) => {
    try {
      await updateRule(editingRule._id, data);
      showToast('Rule updated successfully');
      setEditingRule(null);
      fetchRules();
    } catch (err) {
      const msg =
        err.response?.data?.details?.join(', ') ||
        err.response?.data?.error ||
        'Failed to update rule';
      showToast(msg, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) return;
    try {
      await deleteRule(id);
      showToast('Rule deleted');
      fetchRules();
    } catch {
      showToast('Failed to delete rule', 'error');
    }
  };

  const handleToggleActive = async (rule) => {
    try {
      await updateRule(rule._id, { ...rule, active: !rule.active });
      fetchRules();
    } catch {
      showToast('Failed to toggle rule', 'error');
    }
  };

  const filteredRules = selectedPeriod
    ? rules.filter((r) => r.period === selectedPeriod)
    : rules;

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
      <div className="page-header" style={{ flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2>Rate Limit Rules</h2>
          <p>
            Manage your API rate limiting configurations ({filteredRules.length} rule
            {filteredRules.length !== 1 ? 's' : ''})
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="form-select"
            style={{ width: '160px' }}
            value={selectedIdentity}
            onChange={(e) => setSelectedIdentity(e.target.value)}
          >
            <option value="">All Identities</option>
            <option value="ip">IP Address</option>
            <option value="domain">Domain</option>
            <option value="user">Signed-in User</option>
          </select>

          <select
            className="form-select"
            style={{ width: '150px' }}
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
          >
            <option value="">All Periods</option>
            <option value="minute">Per Minute</option>
            <option value="hour">Per Hour</option>
            <option value="day">Per Day</option>
          </select>

          <button className="btn btn-secondary" onClick={handleSeed} title="Load 15 standard rules">
            <HiOutlineSparkles /> Load 15 Default Rules
          </button>

          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <HiOutlinePlus /> Add Rule
          </button>
        </div>
      </div>

      <div className="card">
        {filteredRules.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🛡️</div>
            <h3>No Rules Found</h3>
            <p>
              {rules.length === 0
                ? 'No rate limit rules configured. Click below to load 15 pre-configured rules (5 IP, 5 Domain, 5 User) across all periods.'
                : 'No rules match the selected filter criteria.'}
            </p>
            <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
              {rules.length === 0 && (
                <button className="btn btn-success" onClick={handleSeed}>
                  <HiOutlineSparkles /> Load 15 Default Rules
                </button>
              )}
              <button
                className="btn btn-primary"
                onClick={() => setShowForm(true)}
              >
                <HiOutlinePlus /> Create Rule
              </button>
            </div>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Identity Type</th>
                  <th>Period</th>
                  <th>Max Requests</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRules.map((rule) => (
                  <tr key={rule._id}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {rule.name}
                    </td>
                    <td>
                      <span className={`badge badge-${rule.identityType}`}>
                        {identityLabels[rule.identityType]}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${rule.period}`}>
                        {periodLabels[rule.period]}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {rule.maxRequests.toLocaleString()}
                    </td>
                    <td>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={rule.active}
                        className={`toggle-btn ${rule.active ? 'active' : ''}`}
                        onClick={() => handleToggleActive(rule)}
                        title={rule.active ? 'Active — Click to disable' : 'Inactive — Click to enable'}
                      >
                        <span className="toggle-knob"></span>
                      </button>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          type="button"
                          className="btn-icon"
                          title="Edit"
                          onClick={() => setEditingRule(rule)}
                        >
                          <HiOutlinePencilSquare />
                        </button>
                        <button
                          type="button"
                          className="btn-icon btn-danger"
                          title="Delete"
                          onClick={() => handleDelete(rule._id)}
                        >
                          <HiOutlineTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showForm && (
        <RuleForm
          onSubmit={handleCreate}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Edit Modal */}
      {editingRule && (
        <RuleForm
          rule={editingRule}
          onSubmit={handleUpdate}
          onClose={() => setEditingRule(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>{toast.message}</div>
        </div>
      )}
    </div>
  );
}
