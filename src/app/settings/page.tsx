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
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.4rem' }}>Cloudflare DNS</h2>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                   <div className={`status-pill ${status.config?.cloudflare?.apiToken ? 'online' : ''}`} style={{ fontSize: '0.6rem' }}>
                      {status.config?.cloudflare?.apiToken ? 'API Linked' : 'No Token'}
                   </div>
                   <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>{cloudflareDomain || 'No primary domain set'}</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="input-group">
                <label className="input-label">Master Domain</label>
                <input 
                  className="console-input" 
                  value={cloudflareDomain}
                  onChange={(e) => setCloudflareDomain(e.target.value)}
                  placeholder="e.g. noxu-overseerr.org"
                  style={{ borderLeft: status.config?.cloudflare?.domain === cloudflareDomain ? '2px solid transparent' : '2px solid var(--accent)' }}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Global API Token</label>
                <input 
                  className="console-input" 
                  type="password"
                  value={cloudflareToken}
                  onChange={(e) => setCloudflareToken(e.target.value)}
                  placeholder="Encoded Secret"
                  style={{ borderLeft: (status.config?.cloudflare?.apiToken && cloudflareToken === status.config.cloudflare.apiToken) ? '2px solid transparent' : '2px solid var(--accent)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                 <div className="input-group">
                    <label className="input-label">Zone ID</label>
                    <input 
                      className="console-input" 
                      value={cloudflareZoneId}
                      onChange={(e) => setCloudflareZoneId(e.target.value)}
                      style={{ borderLeft: status.config?.cloudflare?.zoneId === cloudflareZoneId ? '2px solid transparent' : '2px solid var(--accent)' }}
                    />
                 </div>
                 <div className="input-group">
                    <label className="input-label">Public IP Override</label>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                       <input 
                         className="console-input" 
                         value={publicIp}
                         onChange={(e) => setPublicIp(e.target.value)}
                         placeholder="Auto"
                         style={{ borderLeft: status.config?.cloudflare?.publicIp === publicIp ? '2px solid transparent' : '2px solid var(--accent)' }}
                       />
                       <button className="icon-btn" onClick={detectIp} title="Detect IP">
                          <span style={{ fontSize: '0.8rem' }}>&bull;</span>
                       </button>
                    </div>
                 </div>
              </div>

              <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                 <p style={{ fontSize: '0.65rem', opacity: 0.4, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Current Config State</p>
                 <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                       <span style={{ opacity: 0.6 }}>Target:</span>
                       <span>*.{status.config?.cloudflare?.domain || 'None'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                       <span style={{ opacity: 0.6 }}>A-Record IP:</span>
                       <span style={{ color: 'var(--accent)' }}>{status.config?.cloudflare?.publicIp || 'Not Set'}</span>
                    </div>
                 </div>
              </div>

              <button 
                className="btn btn-primary" 
                onClick={saveCloudflare}
                disabled={loading}
                style={{ width: '100%', marginTop: '0.5rem' }}
              >
                {loading ? 'Committing...' : 'Apply Live Configuration'}
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

          {/* Hytale Core Maintenance */}
          <section className="card glass">
             <div style={{ marginBottom: '1.25rem' }}>
               <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.4rem' }}>Hytale Core Maintenance</h2>
               <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
                 Manage the shared server files (JAR/Assets).
               </p>
             </div>
             
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                   <span style={{ opacity: 0.6 }}>Server JAR:</span>
                   <span style={{ color: status.jarExists ? 'var(--success)' : 'var(--danger)' }}>
                      {status.jarExists ? 'Ready' : 'Missing'}
                   </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                   <span style={{ opacity: 0.6 }}>Assets.zip:</span>
                   <span style={{ color: status.coreFiles?.some((f: any) => f.name === 'Assets.zip') ? 'var(--success)' : 'var(--danger)' }}>
                      {status.coreFiles?.some((f: any) => f.name === 'Assets.zip') ? 'Verified' : 'Missing'}
                   </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                   <span style={{ opacity: 0.6 }}>Downloader:</span>
                   <span style={{ color: status.isDownloading ? 'var(--accent)' : 'inherit' }}>
                      {status.isDownloading ? 'Active...' : 'Idle'}
                   </span>
                </div>
             </div>

             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button 
                  className="btn btn-secondary" 
                  style={{ width: '100%', fontSize: '0.8rem' }}
                  onClick={async () => {
                     if (confirm("Force verify core files? This will trigger a re-download if any keys are missing.")) {
                        await fetch('/api/system/maintenance', { method: 'POST', body: JSON.stringify({ action: 'verify-core' }) });
                        fetchStatus();
                     }
                  }}
                >
                   Verify Integrity
                </button>
                <button 
                  className="btn btn-danger" 
                  style={{ width: '100%', fontSize: '0.8rem', opacity: 0.8 }}
                  onClick={async () => {
                     if (confirm("NUCLEAR RESET: This will delete HytaleServer.jar and Assets.zip and download them fresh. YOUR WORLDS ARE SAFE. Proceed?")) {
                        await fetch('/api/system/maintenance', { method: 'POST', body: JSON.stringify({ action: 'reset-core' }) });
                        fetchStatus();
                     }
                  }}
                >
                   Full Reset Core Files
                </button>
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
