'use client';

import { useEffect, useState, useRef, use } from 'react';
import Link from 'next/link';

interface ServerInstance {
  id: string;
  name: string;
  port: number;
  status: 'online' | 'offline' | 'starting' | 'error';
  logs: string[];
  subdomain?: string;
  maxRam: number;
}

export default function InstanceDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [instance, setInstance] = useState<ServerInstance | null>(null);
  const [command, setCommand] = useState('');
  const [config, setConfig] = useState('');
  const consoleRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<'console' | 'mods' | 'config' | 'settings'>('console');
  
  // Settings tab states
  const [editRam, setEditRam] = useState(2048);
  const [editPort, setEditPort] = useState(0);

  const fetchInstance = async () => {
    try {
      const res = await fetch(`/api/servers/${id}`);
      const data = await res.json();
      setInstance(data);
      if (!instance) {
          setEditRam(data.maxRam);
          setEditPort(data.port);
      }
    } catch (e) {
      console.error('Failed to fetch instance', e);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch(`/api/servers/${id}/config`);
      const data = await res.json();
      if (data.config) setConfig(data.config);
    } catch (e) {}
  };

  useEffect(() => {
    fetchInstance();
    const interval = setInterval(fetchInstance, 2000); 
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    if (tab === 'config') fetchConfig();
  }, [tab]);

  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [instance?.logs]);

  const apiAction = async (action: string) => {
    await fetch(`/api/servers/${id}/${action}`, { method: 'POST' });
    fetchInstance();
  };

  const sendCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command) return;
    await fetch(`/api/servers/${id}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command }),
    });
    setCommand('');
  };

  const saveConfig = async () => {
    await fetch(`/api/servers/${id}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
    });
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`/api/servers/${id}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxRam: editRam, port: editPort }),
    });
    alert('Settings saved. Restart server to apply.');
    fetchInstance();
  };

  const deleteInstance = async () => {
    if (!confirm('Are you sure you want to delete this instance? ALL DATA WILL BE LOST.')) return;
    try {
      const res = await fetch(`/api/servers/${id}`, { method: 'DELETE' });
      if (res.ok) window.location.href = '/';
      else {
          const error = await res.json();
          alert(`Failed to delete: ${error.error}`);
      }
    } catch (e) {
      alert('An error occurred during deletion');
    }
  };

  if (!instance) return <div className="container">Loading...</div>;

  return (
    <main className="container">
      <Link href="/" style={{ color: 'var(--accent)', fontSize: '0.9rem', marginBottom: '1rem', display: 'block' }}>&larr; Back to Dashboard</Link>
      
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1 className="title" style={{ fontSize: '2.5rem' }}>{instance.id.replace(/-/g, ' ')}</h1>
          <span className={`status-badge status-${instance.status}`}>{instance.status}</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className="btn btn-primary" 
            onClick={() => apiAction('start')}
            disabled={instance.status !== 'offline'}
            style={{ 
                filter: instance.status !== 'offline' ? 'grayscale(0.8)' : 'none', 
                background: instance.status === 'offline' ? 'var(--success)' : 'rgba(255,255,255,0.1)' 
            }}
          >
            Start Server
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => apiAction('stop')}
            disabled={instance.status === 'offline'}
            style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.4)' }}
          >
            Stop
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={deleteInstance}
            disabled={instance.status !== 'offline'}
            style={{ opacity: instance.status !== 'offline' ? 0.3 : 1, fontSize: '0.8rem' }}
          >
            Delete
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '2rem' }}>
        <aside style={{ width: '250px' }}>
          <div className="card glass" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.75rem', opacity: 0.5, textTransform: 'uppercase', marginBottom: '1.5rem', letterSpacing: '0.05em' }}>Performance</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <p style={{ fontSize: '0.7rem', opacity: 0.6, marginBottom: '0.25rem' }}>ALLOCATED RAM</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: '800' }}>{instance.maxRam}</span>
                    <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>MiB</span>
                </div>
              </div>
              <div>
                <p style={{ fontSize: '0.7rem', opacity: 0.6, marginBottom: '0.25rem' }}>NETWORK PORT</p>
                <p style={{ fontWeight: '700', fontSize: '1.2rem' }}>{instance.port}</p>
              </div>
              {instance.subdomain && (
                <div style={{ padding: '1rem', borderRadius: '1rem', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                  <p style={{ fontSize: '0.65rem', opacity: 0.6, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Public DNS</p>
                  <p style={{ fontWeight: '600', color: 'var(--accent)', fontSize: '0.9rem', wordBreak: 'break-all' }}>{instance.subdomain}</p>
                </div>
              )}
            </div>
          </div>
        </aside>

        <section style={{ flex: 1 }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--surface-border)', marginBottom: '1.5rem', gap: '0.5rem' }}>
            {['console', 'mods', 'config', 'settings'].map((t) => (
              <button 
                key={t}
                onClick={() => setTab(t as any)}
                style={{ 
                  padding: '1rem 1.5rem', 
                  background: 'none', 
                  border: 'none', 
                  color: tab === t ? 'var(--accent)' : 'inherit',
                  borderBottom: tab === t ? '3px solid var(--accent)' : '3px solid transparent',
                  cursor: 'pointer',
                  fontWeight: tab === t ? '700' : '400',
                  textTransform: 'uppercase',
                  fontSize: '0.75rem',
                  letterSpacing: '1px',
                  transition: 'var(--transition)'
                }}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="tab-content" style={{ minHeight: '500px' }}>
              {tab === 'console' && (
                <div>
                  <div className="console" ref={consoleRef} style={{ background: 'rgba(0,0,0,0.5)', height: '500px' }}>
                    {instance.logs.length === 0 ? (
                        <div style={{ opacity: 0.3, textAlign: 'center', marginTop: '40%' }}>Waiting for server output...</div>
                    ) : (
                        instance.logs.map((log, i) => <div key={i}>{log}</div>)
                    )}
                  </div>
                  <form onSubmit={sendCommand}>
                    <input 
                      className="console-input" 
                      value={command}
                      onChange={(e) => setCommand(e.target.value)}
                      placeholder="Type a command (e.g. /say Hello)..." 
                      style={{ background: 'rgba(0,0,0,0.8)', border: '1px solid var(--surface-border)', padding: '1rem' }}
                    />
                  </form>
                </div>
              )}

              {tab === 'mods' && (
                <div className="card glass" style={{ height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed' }}>
                   <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📦</p>
                    <p style={{ opacity: 0.6 }}>Drag and drop mods here to install them.</p>
                    <p style={{ fontSize: '0.75rem', opacity: 0.4, marginTop: '0.5rem' }}>(Direct filesystem sync enabled)</p>
                   </div>
                </div>
              )}

              {tab === 'config' && (
                <div className="card glass" style={{ height: '500px', padding: 0, overflow: 'hidden' }}>
                   <textarea 
                      style={{ width: '100%', height: 'calc(100% - 30px)', background: 'transparent', color: '#fff', border: 'none', padding: '1.5rem', fontSize: '0.85rem', fontFamily: 'monospace', outline: 'none' }}
                      value={config}
                      onChange={(e) => setConfig(e.target.value)}
                      onBlur={saveConfig}
                      placeholder="# Server properties..."
                    />
                    <div style={{ padding: '0.5rem 1rem', fontSize: '0.7rem', opacity: 0.4, textAlign: 'right', background: 'rgba(0,0,0,0.2)' }}>Changes saved automatically on blur.</div>
                </div>
              )}

              {tab === 'settings' && (
                <div className="card glass" style={{ padding: '2rem' }}>
                    <h3 style={{ marginBottom: '2rem' }}>Instance Settings</h3>
                    <form onSubmit={saveSettings} style={{ maxWidth: '400px' }}>
                        <div className="form-group">
                            <label>Maximum RAM (MB)</label>
                            <input 
                                className="form-input" 
                                type="number" 
                                min="1024"
                                step="512"
                                value={editRam}
                                onChange={(e) => setEditRam(parseInt(e.target.value))}
                                disabled={instance.status !== 'offline'}
                            />
                            {instance.status !== 'offline' && <p style={{ fontSize: '0.7rem', color: 'var(--warning)', marginTop: '0.5rem' }}>Stop server to change RAM.</p>}
                        </div>
                        <div className="form-group">
                            <label>Server Port</label>
                            <input 
                                className="form-input" 
                                type="number"
                                value={editPort}
                                onChange={(e) => setEditPort(parseInt(e.target.value))}
                                disabled
                            />
                            <p style={{ fontSize: '0.7rem', opacity: 0.4, marginTop: '0.5rem' }}>Port changing is currently locked to core range.</p>
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }} disabled={instance.status !== 'offline'}>Save Changes</button>
                    </form>
                </div>
              )}
          </div>
        </section>
      </div>
    </main>
  );
}
