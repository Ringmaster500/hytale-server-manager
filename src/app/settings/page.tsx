'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Settings() {
  const [status, setStatus] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [cfConfig, setCfConfig] = useState({
      accountId: '',
      tunnelId: '',
      apiToken: '',
      domain: ''
  });

  const fetchData = async () => {
    const sRes = await fetch('/api/system');
    const sData = await sRes.json();
    setStatus(sData);
    if (sData.config?.cloudflare) {
        setCfConfig(prev => ({ ...prev, ...sData.config.cloudflare }));
    }

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

  const rescanFilesystem = async () => {
    setLoading(true);
    const res = await fetch('/api/system', { 
        method: 'POST',
        body: JSON.stringify({ action: 'check' })
    });
    const data = await res.json();
    setStatus(data);
    setLoading(false);
  };

  const saveCfConfig = async () => {
      setLoading(true);
      await fetch('/api/system', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'save_cloudflare', config: cfConfig })
      });
      setLoading(false);
      alert("Cloudflare configuration saved!");
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
              <span style={{ opacity: 0.6 }}>Node Version</span>
              <span>{status.nodeVersion}</span>
            </div>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexDirection: 'column' }}>
            <button className="btn btn-primary" style={{ justifyContent: 'center' }} onClick={rescanFilesystem} disabled={loading}>
              Re-scan Filesystem
            </button>
            <button className="btn btn-secondary" style={{ justifyContent: 'center', opacity: 0.8 }} onClick={retriggerDownload} disabled={loading}>
              Force Re-download
            </button>
            <button className="btn btn-secondary" style={{ color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.2)', justifyContent: 'center' }} onClick={resetSystem} disabled={loading}>
              Reset Configuration
            </button>

            {/* Cloudflare Network Configuration */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm animate-in slide-in-from-bottom duration-500 delay-200">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-orange-500/20 text-orange-400 rounded-lg">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">Cloudflare Network</h2>
                        <p className="text-sm text-slate-400">Manage Zero-Trust Tunnels & Subdomains</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Account ID</label>
                        <input 
                            type="text" 
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 outline-none focus:border-orange-500/50 transition-colors"
                            value={cfConfig.accountId}
                            onChange={(e) => setCfConfig({ ...cfConfig, accountId: e.target.value })}
                            placeholder="From your Cloudflare Dashboard"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tunnel ID</label>
                        <input 
                            type="text" 
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 outline-none focus:border-orange-500/50 transition-colors"
                            value={cfConfig.tunnelId}
                            onChange={(e) => setCfConfig({ ...cfConfig, tunnelId: e.target.value })}
                            placeholder="Your Argo Tunnel ID"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">API Token (Zone/Tunnel access)</label>
                        <input 
                            type="password" 
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 outline-none focus:border-orange-500/50 transition-colors"
                            value={cfConfig.apiToken}
                            onChange={(e) => setCfConfig({ ...cfConfig, apiToken: e.target.value })}
                            placeholder="Cloudflare API Token"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Primary Domain</label>
                        <input 
                            type="text" 
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 outline-none focus:border-orange-500/50 transition-colors"
                            value={cfConfig.domain}
                            onChange={(e) => setCfConfig({ ...cfConfig, domain: e.target.value })}
                            placeholder="noxu-overseerr.org"
                        />
                    </div>
                </div>
                
                <button 
                    onClick={saveCfConfig}
                    className="mt-6 w-full py-3 bg-orange-600 hover:bg-orange-500 active:scale-95 transition-all font-bold rounded-lg shadow-lg shadow-orange-900/20"
                >
                    Save Cloudflare Configuration
                </button>
            </div>
          </div>
        </div>

        <div className="card glass">
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>Core Files Explorer</h2>
          <div style={{ fontSize: '0.8rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '1rem', height: '200px', overflowY: 'auto' }}>
            {status.coreFiles && status.coreFiles.length > 0 ? (
                status.coreFiles.map((file: any) => (
                    <div key={file.name} style={{ padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{file.isDirectory ? '📁' : '📄'} {file.name}</span>
                        <span style={{ opacity: 0.4 }}>{file.isDirectory ? 'DIR' : 'FILE'}</span>
                    </div>
                ))
            ) : (
                <p style={{ opacity: 0.5, textAlign: 'center', marginTop: '2rem' }}>No files found in data/core</p>
            )}
          </div>
          <p style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: '0.5rem' }}>Path: ./data/core/</p>
        </div>

        <div className="card glass" style={{ gridColumn: '1 / -1' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>System Logs</h2>
          <div className="console" style={{ height: '300px', fontSize: '0.75rem' }}>
            {logs.map((log, i) => <div key={i}>{log}</div>)}
          </div>
        </div>
      </div>
    </main>
  );
}
