'use client';

import { useEffect, useState, useRef, use } from 'react';
import Link from 'next/link';

interface ServerInstance {
  id: string;
  name: string;
  port: number;
  status: 'online' | 'offline' | 'starting' | 'error';
  logs: string[];
}

export default function InstanceDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [instance, setInstance] = useState<ServerInstance | null>(null);
  const [command, setCommand] = useState('');
  const [config, setConfig] = useState('');
  const consoleRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<'console' | 'mods' | 'config'>('console');

  const fetchInstance = async () => {
    try {
      const res = await fetch(`/api/servers/${id}`);
      const data = await res.json();
      setInstance(data);
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
      body: JSON.stringify({ command }),
    });
    setCommand('');
  };

  const saveConfig = async () => {
    await fetch(`/api/servers/${id}/config`, {
      method: 'POST',
      body: JSON.stringify({ config }),
    });
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
        <div>
          <h1 className="title" style={{ fontSize: '2.5rem' }}>{instance.name}</h1>
          <p style={{ marginTop: '0.25rem', opacity: 0.6 }}>Instance ID: {instance.id}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="btn btn-primary" 
            onClick={() => apiAction('start')}
            disabled={instance.status !== 'offline'}
            style={{ filter: instance.status !== 'offline' ? 'grayscale(1)' : 'none', background: 'var(--success)' }}
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
          <div className="card glass">
            <h3 style={{ fontSize: '0.9rem', opacity: 0.6, marginBottom: '1rem' }}>STATUS</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <span className={`status-badge status-${instance.status}`}>{instance.status}</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <p style={{ fontSize: '0.75rem', opacity: 0.6 }}>CORE VERSION</p>
                <p style={{ fontWeight: '600' }}>Hytale 1.4.2</p>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', opacity: 0.6 }}>PORT</p>
                <p style={{ fontWeight: '600' }}>{instance.port}</p>
              </div>
            </div>
          </div>
        </aside>

        <section style={{ flex: 1 }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--surface-border)', marginBottom: '1.5rem' }}>
            {['console', 'mods', 'config'].map((t) => (
              <button 
                key={t}
                onClick={() => setTab(t as any)}
                style={{ 
                  padding: '1rem 1.5rem', 
                  background: 'none', 
                  border: 'none', 
                  color: tab === t ? 'var(--accent)' : 'inherit',
                  borderBottom: tab === t ? '2px solid var(--accent)' : 'none',
                  cursor: 'pointer',
                  fontWeight: tab === t ? '700' : '400',
                  textTransform: 'uppercase',
                  fontSize: '0.8rem'
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'console' && (
            <div>
              <div className="console" ref={consoleRef}>
                {instance.logs.map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
              </div>
              <form onSubmit={sendCommand}>
                <input 
                  className="console-input" 
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder="Type a command (e.g. /say Hello)..." 
                />
              </form>
            </div>
          )}

          {tab === 'mods' && (
            <div className="card glass" style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <p style={{ opacity: 0.6 }}>Drag and drop mods here (Coming soon)</p>
            </div>
          )}

          {tab === 'config' && (
            <div className="card glass" style={{ height: '400px', padding: 0 }}>
               <textarea 
                  style={{ width: '100%', height: '100%', background: '#111', color: '#fff', border: 'none', padding: '1.5rem', fontSize: '0.85rem', fontFamily: 'monospace' }}
                  value={config}
                  onChange={(e) => setConfig(e.target.value)}
                  onBlur={saveConfig}
                  placeholder="# Server properties loaded from server.properties..."
                />
                <div style={{ padding: '0.5rem 1rem', fontSize: '0.7rem', opacity: 0.5, textAlign: 'right' }}>Changes saved automatically on blur.</div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
