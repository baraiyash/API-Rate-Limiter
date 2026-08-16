import { useState, useEffect, useRef } from 'react';
import {
  HiOutlinePlay,
  HiOutlineTrash,
  HiOutlineStop,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineKey,
  HiOutlineSparkles,
  HiOutlineShieldCheck,
} from 'react-icons/hi2';
import { sendTestRequest, generateJwtToken, getRules } from '../services/api';

const PRESET_COUNTS = [10, 50, 100, 250, 500, 1000, 2500];

export default function TestAPI() {
  const [config, setConfig] = useState({
    count: 25,
    concurrency: 5,
    targetRuleId: '',
    ip: '',
    domain: '',
    userId: '',
    jwtToken: '',
    delay: 20,
  });

  const [availableRules, setAvailableRules] = useState([]);
  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [stats, setStats] = useState({ success: 0, limited: 0, error: 0 });
  const [tokenMsg, setTokenMsg] = useState('');

  const abortRef = useRef(false);

  useEffect(() => {
    getRules()
      .then((res) => setAvailableRules(res.data || []))
      .catch(() => {});
  }, []);

  const handleSelectRule = (ruleId) => {
    setConfig((prev) => ({ ...prev, targetRuleId: ruleId }));
    const found = availableRules.find((r) => r._id === ruleId);
    if (found) {
      if (found.identityType === 'ip' && !config.ip) {
        handleGenerateRandomIp();
      } else if (found.identityType === 'domain' && !config.domain) {
        setConfig((prev) => ({ ...prev, domain: 'example.com' }));
      } else if (found.identityType === 'user' && !config.userId && !config.jwtToken) {
        setConfig((prev) => ({ ...prev, userId: 'cust_vip_42' }));
      }
    }
  };

  const handleGenerateRandomIp = () => {
    const octet1 = Math.floor(Math.random() * 200) + 10;
    const octet2 = Math.floor(Math.random() * 250) + 1;
    const octet3 = Math.floor(Math.random() * 250) + 1;
    const octet4 = Math.floor(Math.random() * 250) + 1;
    const randomIp = `${octet1}.${octet2}.${octet3}.${octet4}`;
    setConfig((prev) => ({ ...prev, ip: randomIp }));
  };

  const handleGenerateJwt = async () => {
    try {
      const uId = config.userId.trim() || 'cust_vip_42';
      const res = await generateJwtToken({ userId: uId, plan: 'enterprise' });
      setConfig((prev) => ({ ...prev, jwtToken: res.data.token, userId: uId }));
      setTokenMsg(`Generated JWT for "${uId}"`);
      setTimeout(() => setTokenMsg(''), 4000);
    } catch {
      setTokenMsg('Failed to generate token');
      setTimeout(() => setTokenMsg(''), 4000);
    }
  };

  const handleStop = () => {
    abortRef.current = true;
  };

  const handleClear = () => {
    setResults([]);
    setProgress({ current: 0, total: 0 });
    setStats({ success: 0, limited: 0, error: 0 });
  };

  const handleRun = async () => {
    if (config.count <= 0) return;

    setRunning(true);
    abortRef.current = false;

    const total = config.count;
    setProgress({ current: 0, total });
    setStats({ success: 0, limited: 0, error: 0 });

    const newResults = [];
    let successCount = 0;
    let limitedCount = 0;
    let errorCount = 0;

    const concurrency = Math.max(1, Math.min(config.concurrency || 1, 50));
    let sent = 0;

    const sendSingle = async (index) => {
      if (abortRef.current) return null;

      const headers = {};
      if (config.targetRuleId) headers['X-Target-Rule-Id'] = config.targetRuleId;
      if (config.ip.trim()) headers['X-Custom-IP'] = config.ip.trim();
      if (config.domain.trim()) headers['X-Domain'] = config.domain.trim();
      if (config.jwtToken.trim()) {
        headers['Authorization'] = `Bearer ${config.jwtToken.trim()}`;
      } else if (config.userId.trim()) {
        headers['X-User-Id'] = config.userId.trim();
      }

      try {
        const res = await sendTestRequest(headers);
        const rl = res.data?.rateLimit || {};
        const limitVal =
          rl.limit !== undefined
            ? rl.limit.toLocaleString()
            : res.headers['x-ratelimit-limit'] || 'N/A';
        const remainingVal =
          rl.remaining !== undefined
            ? rl.remaining.toLocaleString()
            : res.headers['x-ratelimit-remaining'] || 'N/A';

        return {
          id: `${Date.now()}-${index}`,
          status: res.status,
          success: true,
          remaining: remainingVal,
          limit: limitVal,
          ruleName: rl.ruleName || '',
          period: rl.period || '',
          timestamp: new Date().toLocaleTimeString(),
          message: res.data?.message || 'Allowed by rate limiter',
        };
      } catch (err) {
        const status = err.response?.status || 500;
        const data = err.response?.data || {};
        const limitVal = data.rule?.maxRequests !== undefined
          ? data.rule.maxRequests.toLocaleString()
          : 'N/A';

        return {
          id: `${Date.now()}-${index}`,
          status,
          success: false,
          remaining: '0',
          limit: limitVal,
          ruleName: data.rule?.name || '',
          period: data.rule?.period || '',
          timestamp: new Date().toLocaleTimeString(),
          message: data.message || err.message,
          retryAfter: data.retryAfter,
        };
      }
    };

    while (sent < total && !abortRef.current) {
      const batchSize = Math.min(concurrency, total - sent);
      const promises = [];

      for (let i = 0; i < batchSize; i++) {
        promises.push(sendSingle(sent + i));
      }

      const batchResults = await Promise.all(promises);

      for (const res of batchResults) {
        if (!res) continue;
        if (res.status === 200) successCount++;
        else if (res.status === 429) limitedCount++;
        else errorCount++;

        newResults.unshift(res);
      }

      sent += batchSize;
      setProgress({ current: sent, total });
      setStats({ success: successCount, limited: limitedCount, error: errorCount });

      // Keep recent 100 logs in DOM for max performance on high volumes
      setResults([...newResults.slice(0, 100)]);

      if (sent < total && config.delay > 0 && !abortRef.current) {
        await new Promise((r) => setTimeout(r, config.delay));
      }
    }

    setRunning(false);
  };

  const percentComplete =
    progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h2>Test API</h2>
          <p>Send burst or high-volume test traffic to evaluate rate-limiting rules</p>
        </div>
      </div>

      {/* Real-time metrics bar */}
      {(progress.total > 0 || running) && (
        <div
          className="card"
          style={{
            marginBottom: '24px',
            padding: '20px 24px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            background: 'rgba(17, 24, 39, 0.8)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Progress:</span>
                <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                  {progress.current} / {progress.total} ({percentComplete}%)
                </strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399' }}>
                <HiOutlineCheckCircle />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>200 OK: {stats.success}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f87171' }}>
                <HiOutlineExclamationTriangle />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>
                  429 Too Many: {stats.limited}
                </span>
              </div>

              {stats.error > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fbbf24' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>Errors: {stats.error}</span>
                </div>
              )}
            </div>

            {running && (
              <span
                className="badge badge-minute"
                style={{ animation: 'pulse 1.5s infinite', display: 'inline-flex', gap: '6px' }}
              >
                <span className="spinner" style={{ width: '12px', height: '12px', borderWidth: '2px' }}></span>
                Sending traffic...
              </span>
            )}
          </div>

          {/* Progress bar track */}
          <div
            style={{
              width: '100%',
              height: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '9999px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${percentComplete}%`,
                background:
                  stats.limited > 0
                    ? 'linear-gradient(90deg, #10b981 0%, #ef4444 100%)'
                    : 'linear-gradient(90deg, #6366f1 0%, #10b981 100%)',
                transition: 'width 0.15s ease',
              }}
            ></div>
          </div>
        </div>
      )}

      <div className="test-panel">
        {/* Configuration Panel */}
        <div className="card">
          <div className="card-header">
            <h2>Traffic Configuration</h2>
          </div>
          <div className="card-body">
            <div className="test-config">
              {/* Target Rule selector */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">
                  Target Specific Rule{' '}
                  <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none' }}>
                    (Optional — Isolate and test a single rule without triggering tighter rules)
                  </span>
                </label>
                <select
                  className="form-select"
                  value={config.targetRuleId}
                  onChange={(e) => handleSelectRule(e.target.value)}
                  disabled={running}
                >
                  <option value="">⚡ All Active Rules (Full Chain Evaluation)</option>
                  {availableRules.map((rule) => (
                    <option key={rule._id} value={rule._id}>
                      {rule.name} ({rule.maxRequests.toLocaleString()} reqs / {rule.period}) [{rule.identityType.toUpperCase()}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Presets */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Quick Volume Presets</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {PRESET_COUNTS.map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      className={`btn btn-sm ${config.count === cnt ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setConfig((prev) => ({ ...prev, count: cnt }))}
                      disabled={running}
                    >
                      {cnt.toLocaleString()} reqs
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Total Requests</label>
                  <input
                    className="form-input"
                    type="number"
                    min="1"
                    max="50000"
                    step="1"
                    placeholder="e.g., 500"
                    value={config.count}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        count: Math.max(1, parseInt(e.target.value, 10) || 1),
                      })
                    }
                    disabled={running}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Concurrency{' '}
                    <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none' }}>
                      (Parallel)
                    </span>
                  </label>
                  <select
                    className="form-select"
                    value={config.concurrency}
                    onChange={(e) =>
                      setConfig({ ...config, concurrency: parseInt(e.target.value, 10) || 1 })
                    }
                    disabled={running}
                  >
                    <option value="1">1 (Sequential)</option>
                    <option value="5">5 parallel</option>
                    <option value="10">10 parallel</option>
                    <option value="25">25 parallel (Fast)</option>
                    <option value="50">50 parallel (Burst)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Batch Delay (ms){' '}
                  <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none' }}>
                    (0 for maximum burst)
                  </span>
                </label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  max="5000"
                  step="10"
                  value={config.delay}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      delay: Math.max(0, parseInt(e.target.value, 10) || 0),
                    })
                  }
                  disabled={running}
                />
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label" style={{ margin: 0 }}>
                    Client IP Address{' '}
                    <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none' }}>
                      (Simulation / Header)
                    </span>
                  </label>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleGenerateRandomIp}
                    disabled={running}
                    style={{ fontSize: '11px', padding: '3px 8px' }}
                    title="Generate a random testing IP address"
                  >
                    🎲 Random IP
                  </button>
                </div>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g., 192.168.1.100 or 10.0.0.5 (Leave blank to use actual socket IP)"
                  value={config.ip}
                  onChange={(e) =>
                    setConfig({ ...config, ip: e.target.value })
                  }
                  disabled={running}
                  style={{ fontFamily: 'monospace', fontSize: '13px' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  X-Domain Header{' '}
                  <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none' }}>
                    (to test Domain rules)
                  </span>
                </label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g., example.com or partner.api.com"
                  value={config.domain}
                  onChange={(e) =>
                    setConfig({ ...config, domain: e.target.value })
                  }
                  disabled={running}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  X-User-Id Header{' '}
                  <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none' }}>
                    (User identity identifier)
                  </span>
                </label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g., user-101 or cust_vip_99"
                  value={config.userId}
                  onChange={(e) =>
                    setConfig({ ...config, userId: e.target.value })
                  }
                  disabled={running}
                />
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label" style={{ margin: 0 }}>
                    JWT Authorization Token{' '}
                    <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none' }}>
                      (Bearer)
                    </span>
                  </label>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleGenerateJwt}
                    disabled={running}
                    style={{ fontSize: '11px', padding: '3px 8px' }}
                  >
                    <HiOutlineSparkles /> Generate JWT
                  </button>
                </div>
                <input
                  className="form-input"
                  type="text"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={config.jwtToken}
                  onChange={(e) =>
                    setConfig({ ...config, jwtToken: e.target.value })
                  }
                  disabled={running}
                  style={{ fontFamily: 'monospace', fontSize: '11.5px' }}
                />
                {tokenMsg && (
                  <span style={{ fontSize: '11.5px', color: 'var(--accent-success)', marginTop: '4px', display: 'block' }}>
                    ✓ {tokenMsg}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                {!running ? (
                  <button
                    className="btn btn-primary"
                    onClick={handleRun}
                    style={{ flex: 1 }}
                  >
                    <HiOutlinePlay /> Start {config.count.toLocaleString()} Requests
                  </button>
                ) : (
                  <button
                    className="btn btn-danger"
                    onClick={handleStop}
                    style={{ flex: 1 }}
                  >
                    <HiOutlineStop /> Stop Execution
                  </button>
                )}

                <button
                  className="btn btn-secondary"
                  onClick={handleClear}
                  disabled={running}
                >
                  <HiOutlineTrash /> Clear
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="card">
          <div className="card-header">
            <h2>Live Responses</h2>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {results.length > 0
                ? `Showing latest ${results.length} response${results.length !== 1 ? 's' : ''}`
                : '0 responses'}
            </span>
          </div>
          <div className="card-body" style={{ padding: '16px' }}>
            {results.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <div className="empty-state-icon">⚡</div>
                <h3>Ready to Send Traffic</h3>
                <p>
                  Choose a preset or enter any request volume (e.g. 500, 1000, 5000) and click
                  "Start Requests".
                </p>
              </div>
            ) : (
              <div className="test-results" style={{ maxHeight: '560px' }}>
                {results.map((r) => (
                  <div
                    key={r.id}
                    className={`test-result-item ${r.success ? 'success' : 'error'}`}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '4px',
                      }}
                    >
                      <strong>
                        {r.status === 200 ? '200 OK' : `${r.status} Too Many Requests`}{' '}
                        {r.success ? '✓' : '✗'}
                      </strong>
                      <span style={{ opacity: 0.7, fontSize: '11px' }}>{r.timestamp}</span>
                    </div>
                    <div style={{ opacity: 0.9 }}>
                      {r.message}
                      {!r.success && r.retryAfter && (
                        <span style={{ fontWeight: 600, color: '#fbbf24' }}>
                          {' '}• Retry after: {r.retryAfter}s
                        </span>
                      )}
                    </div>
                    <div style={{ opacity: 0.85, marginTop: '4px', fontSize: '11.5px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                      <span>
                        Limit: <strong style={{ color: 'var(--text-primary)' }}>{r.limit}</strong>
                      </span>
                      <span>
                        Remaining:{' '}
                        <strong
                          style={{
                            color: r.success ? 'var(--accent-success)' : 'var(--accent-danger)',
                          }}
                        >
                          {r.remaining}
                        </strong>
                      </span>
                      {r.ruleName && (
                        <span>
                          Rule: <em style={{ color: 'var(--accent-primary-light)' }}>"{r.ruleName}"</em>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
