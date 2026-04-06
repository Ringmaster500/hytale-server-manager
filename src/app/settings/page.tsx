'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

export default function Settings() {
  const [status, setStatus] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const logsRef = useRef<HTMLDivElement>(null);
  
  const [cloudflareDomain, setCloudflareDomain] = useState('');
  const [cloudflareToken, setCloudflareToken] = useState('');
  const [cloudflareZoneId, setCloudflareZoneId] = useState('');
  const [publicIp, setPublicIp] = useState('');
  const [portRangeStart, setPortRangeStart] = useState('5520');
  const [portRangeEnd, setPortRangeEnd] = useState('5600');

  const fetchStatus = async () => {
    const res = await fetch('/api/system');
    const data = await res.json();
    setStatus(data);
    if (data.config?.cloudflare) {
        setCloudflareDomain(data.config.cloudflare.domain || '');
        setCloudflareToken(data.config.cloudflare.apiToken || '');
        setCloudflareZoneId(data.config.cloudflare.zoneId || '');
        setPublicIp(data.config.cloudflare.publicIp || '');
        setPortRangeStart(data.config.portRangeStart?.toString() || '5520');
        setPortRangeEnd(data.config.portRangeEnd?.toString() || '5600');
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
            apiToken: cloudflareToken,
            zoneId: cloudflareZoneId,
            publicIp: publicIp,
            portRangeStart: parseInt(portRangeStart),
            portRangeEnd: parseInt(portRangeEnd)
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

  const detectIp = async () => {
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      setPublicIp(data.ip);
    } catch (e) {
      alert("Could not detect IP.");
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
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>Cloudflare DNS</h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
                Direct A-Record Management
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', opacity: 0.6, marginBottom: '0.4rem', textTransform: 'uppercase' }}>Domain</label>
                <input 
                  className="console-input" 
                  value={cloudflareDomain}
                  onChange={(e) => setCloudflareDomain(e.target.value)}
                  placeholder="noxu-overseerr.org"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', opacity: 0.6, marginBottom: '0.4rem', textTransform: 'uppercase' }}>API Token</label>
                <input 
                  className="console-input" 
                  type="password"
                  value={cloudflareToken}
                  onChange={(e) => setCloudflareToken(e.target.value)}
                  placeholder="cfut_..."
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', opacity: 0.6, marginBottom: '0.4rem', textTransform: 'uppercase' }}>Zone ID</label>
                <input 
                  className="console-input" 
                  value={cloudflareZoneId}
                  onChange={(e) => setCloudflareZoneId(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', opacity: 0.6, marginBottom: '0.4rem', textTransform: 'uppercase' }}>Public Server IP</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                    className="console-input" 
                    value={publicIp}
                    onChange={(e) => setPublicIp(e.target.value)}
                    placeholder="Auto-detected if blank"
                    />
                    <button className="btn btn-secondary" style={{ padding: '0 0.5rem', fontSize: '0.7rem' }} onClick={detectIp}>Detect</button>
                </div>
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

          {/* Instance Default Port Section */}
          <section className="card glass">
             <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>Instance Networking</h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
                UDP Port Range for Hytale servers.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
               <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.7rem', opacity: 0.6, marginBottom: '0.4rem', textTransform: 'uppercase' }}>Min Port</label>
                <input 
                  className="console-input" 
                  value={portRangeStart}
                  onChange={(e) => setPortRangeStart(e.target.value)}
                  type="number"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.7rem', opacity: 0.6, marginBottom: '0.4rem', textTransform: 'uppercase' }}>Max Port</label>
                <input 
                  className="console-input" 
                  value={portRangeEnd}
                  onChange={(e) => setPortRangeEnd(e.target.value)}
                  type="number"
                />
              </div>
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
