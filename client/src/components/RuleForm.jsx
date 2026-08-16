import { useState, useEffect } from 'react';
import { HiXMark } from 'react-icons/hi2';

export default function RuleForm({ rule, onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    identityType: 'ip',
    period: 'minute',
    maxRequests: 100,
    active: true,
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (rule) {
      setFormData({
        name: rule.name || '',
        identityType: rule.identityType || 'ip',
        period: rule.period || 'minute',
        maxRequests: rule.maxRequests ?? 100,
        active: rule.active ?? true,
      });
    }
  }, [rule]);

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Rule name is required';
    if (formData.maxRequests < 0) errs.maxRequests = 'Must be 0 or greater';
    if (!Number.isInteger(Number(formData.maxRequests)))
      errs.maxRequests = 'Must be a whole number';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      ...formData,
      maxRequests: parseInt(formData.maxRequests, 10),
    });
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{rule ? 'Edit Rule' : 'Create New Rule'}</h2>
          <button className="modal-close" onClick={onClose}>
            <HiXMark />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Rule Name</label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g., IP Per Minute Limit"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
              />
              {errors.name && (
                <span style={{ color: 'var(--accent-danger)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  {errors.name}
                </span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Identity Type</label>
              <select
                className="form-select"
                value={formData.identityType}
                onChange={(e) => handleChange('identityType', e.target.value)}
              >
                <option value="ip">IP Address</option>
                <option value="domain">Domain</option>
                <option value="user">User / Customer</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Time Period</label>
              <select
                className="form-select"
                value={formData.period}
                onChange={(e) => handleChange('period', e.target.value)}
              >
                <option value="minute">Per Minute</option>
                <option value="hour">Per Hour</option>
                <option value="day">Per Day</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Max Requests</label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="1"
                placeholder="e.g., 100"
                value={formData.maxRequests}
                onChange={(e) => handleChange('maxRequests', e.target.value)}
              />
              {errors.maxRequests && (
                <span style={{ color: 'var(--accent-danger)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  {errors.maxRequests}
                </span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" style={{ marginBottom: '8px' }}>
                Status
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  type="button"
                  role="switch"
                  aria-checked={formData.active}
                  className={`toggle-btn ${formData.active ? 'active' : ''}`}
                  onClick={() => handleChange('active', !formData.active)}
                  title={formData.active ? 'Active' : 'Inactive'}
                >
                  <span className="toggle-knob"></span>
                </button>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    color: formData.active
                      ? 'var(--accent-success)'
                      : 'var(--text-muted)',
                  }}
                >
                  {formData.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {rule ? 'Update Rule' : 'Create Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
