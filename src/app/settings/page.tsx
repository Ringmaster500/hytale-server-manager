'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

export default function Settings() {
  const [status, setStatus] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const logsRef = useRef<HTMLDivElement>(null);
  
  const [cloudflareDomain, setCloudflareDomain] = useState('');
  const [cloudflareConfigPath, setCloudflareConfigPath] = useState('/app/data/tunnel/config.yml');

  const fetchStatus = async () => {
    const res = await fetch('/api/system');
    const data = await res.json();
    setStatus(data);
    if (data.config?.cloudflare) {
        setCloudflareDomain(data.config.cloudflare.domain || '');
        setCloudflareConfigPath(data.config.cloudflare.configPath || '/app/data/tunnel/config.yml');
    }
    
    // Fetch logs
    const lRes = await fetch('/api/logs');
    const lData = await lRes.json();
    setLogs(lData.logs || []);
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  const saveCloudflare = async () => {
    setLoading(true);
    try {
      await fetch('/api/system', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'save_cloudflare', 
            domain: cloudflareDomain,
            configPath: cloudflareConfigPath
          })
      });
      alert("Settings saved!");
      fetchStatus();
    } catch (e) {
      alert("Failed to save.");
    } finally {
      setLoading(false);
    }
  };

  if (!status) return <div className="container">Loading settings...</div>;

  return (
    <main className="container">
      <Link href="/" style={{ color: 'var(--accent)', fontSize: '0.9rem', marginBottom: '1rem', display: 'block' }}>&larr; Back to Dashboard</Link>
      
      <header className="header">
        <h1 className="title">System Control</h1>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) 2fr', gap: '2rem' }}>
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Cloudflare Section */}
          <section className="card glass">
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>Network</h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
                Local Tunnel Automation
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', opacity: 0.6, marginBottom: '0.4rem', textTransform: 'uppercase' }}>Domain</label>
                <input 
                  className="console-input" 
                  value={cloudflareDomain}
                  onChange={(e) => setCloudflareDomain(e.target.value)}
                  placeholder="e.g. your-domain.com"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', opacity: 0.6, marginBottom: '0.4rem', textTransform: 'uppercase' }}>Docker Config Path</label>
                <input 
                  className="console-input" 
                  value={cloudflareConfigPath}
                  onChange={(e) => setCloudflareConfigPath(e.target.value)}
                />
              </div>

              <button 
                className="btn btn-primary" 
                onClick={saveCloudflare}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Update Settings'}
              </button>
            </div>
          </section>

          {/* System Info */}
          <section className="card glass" style={{ opacity: 0.8 }}>
             <h3 style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '1rem', textTransform: 'uppercase' }}>Core Stability</h3>
             <div style={{ fontSize: '0.9rem' }}>
                <p>Node: {status.nodeVersion}</p>
                <p>Status: <span style={{ color: 'var(--success)' }}>{status.jarStatus}</span></p>
                <p>Assets: Verified</p>
             </div>
          </section>
        </aside>

        {/* Logs Section */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>System Logs</h2>
          <div 
            className="console" 
            ref={logsRef} 
            style={{ height: '500px', fontSize: '0.8rem', background: 'rgba(0,0,0,0.4)', borderRadius: '0.75rem' }}
          >
            {logs.map((log, i) => (
              <div key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '0.25rem 0' }}>
                 {log}
              </div>
            ))}
            {logs.length === 0 && <div style={{ opacity: 0.4 }}>Initializing system heartbeat...</div>}
          </div>
          <p style={{ fontSize: '0.7rem', opacity: 0.4, textAlign: 'right' }}>Logs refresh every 3 seconds.</p>
        </section>
      </div>
    </main>
  );
}
