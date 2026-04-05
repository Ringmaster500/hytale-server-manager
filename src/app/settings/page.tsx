'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Settings() {
  const [status, setStatus] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    const sRes = await fetch('/api/system');
    const sData = await sRes.json();
    setStatus(sData);

    const lRes = await fetch('/api/logs');
    const lData = await lRes.json();
    setLogs(lData.logs);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const resetSystem = async () => {
    if (!confirm('Are you sure? This will delete your configuration and Core JAR. You will need to redo onboarding.')) return;
    setLoading(true);
    await fetch('/api/system', { method: 'DELETE' });
    window.location.href = '/onboarding';
  };

  const retriggerDownload = async () => {
    setLoading(true);
    await fetch('/api/system', { method: 'POST' });
    alert('Download re-triggered. Monitor logs below.');
    setLoading(false);
  };

  if (!status) return <div className="container">Loading...</div>;

  return (
    <main className="container">
      <Link href="/" style={{ color: 'var(--accent)', fontSize: '0.9rem', marginBottom: '1rem', display: 'block' }}>&larr; Back to Dashboard</Link>
      
      <header className="header" style={{ marginBottom: '2rem' }}>
        <h1 className="title">System Settings</h1>
      </header>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        <div className="card glass">
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>Core Status</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ opacity: 0.6 }}>Hytale Server JAR</span>
              <span style={{ color: status.jarExists ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold' }}>
                {status.jarExists ? 'INSTALLED' : 'MISSING'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ opacity: 0.6 }}>JAR Status</span>
              <span style={{ color: status.jarStatus === 'ready' ? 'var(--success)' : 'orange' }}>{status.jarStatus.toUpperCase()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ opacity: 0.6 }}>File Size</span>
              <span>{(status.jarSize / 1024 / 1024).toFixed(2)} MB</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ opacity: 0.6 }}>Onboarding Done</span>
              <span>{status.onboarded ? 'Yes' : 'No'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ opacity: 0.6 }}>Instances Count</span>
              <span>{status.instancesCount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ opacity: 0.6 }}>Mock Mode</span>
              <span style={{ color: status.mockMode ? 'orange' : 'inherit' }}>{status.mockMode ? 'ENABLED' : 'DISABLED'}</span>
            </div>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexDirection: 'column' }}>
            <button className="btn btn-primary" style={{ justifyContent: 'center' }} onClick={retriggerDownload} disabled={loading}>
              Force Re-trigger Download
            </button>
            <button className="btn btn-secondary" style={{ color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.4)', justifyContent: 'center' }} onClick={resetSystem} disabled={loading}>
              Reset Configuration
            </button>
          </div>
        </div>

        <div className="card glass" style={{ gridColumn: 'span 1' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>System Logs</h2>
          <div className="console" style={{ height: '300px', fontSize: '0.75rem' }}>
            {logs.map((log, i) => <div key={i}>{log}</div>)}
          </div>
        </div>
      </div>
    </main>
  );
}
