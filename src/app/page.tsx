'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ServerInstance {
  id: string;
  name: string;
  port: number;
  status: 'online' | 'offline' | 'starting' | 'error';
  subdomain?: string;
}

export default function Home() {
  const [instances, setInstances] = useState<ServerInstance[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInstances = async () => {
    try {
      const res = await fetch('/api/servers');
      const data = await res.json();
      setInstances(data);
    } catch (e) {
      console.error('Failed to fetch instances', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkOnboarding = async () => {
      const res = await fetch('/api/setup');
      const data = await res.json();
      if (!data.isOnboarded) {
        window.location.href = '/onboarding';
      } else {
        fetchInstances();
      }
    };
    checkOnboarding();
    const interval = setInterval(fetchInstances, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  const createInstance = async () => {
    const name = prompt('Instance Name:');
    if (!name) return;
    const port = parseInt(prompt('Port (default 4242):') || '4242');
    
    setLoading(true);
    await fetch('/api/servers', {
      method: 'POST',
      body: JSON.stringify({ name, port }),
    });
    fetchInstances();
  };

  return (
    <main className="container">
      <header className="header">
        <div>
          <h1 className="title">Hytale Manager</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '0.25rem' }}>Control your server instances natively.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/settings">
            <button className="btn btn-secondary">System Settings</button>
          </Link>
          <button className="btn btn-primary" onClick={createInstance}>
            <span>+</span> Create New Instance
          </button>
        </div>
      </header>

      <div className="grid">
        {instances.length === 0 && !loading && (
          <div className="card glass" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem' }}>
            <p>No server instances found. Create your first one!</p>
          </div>
        )}

        {instances.map((inst) => (
          <Link key={inst.id} href={`/instances/${inst.id}`}>
            <div className="card glass">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>{inst.name}</h2>
                <span className={`status-badge status-${inst.status}`}>
                  {inst.status}
                </span>
              </div>
              
              <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Port</label>
                  <p style={{ fontWeight: '600' }}>{inst.port}</p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Platform</label>
                  <p style={{ fontWeight: '600' }}>Java 21</p>
                </div>
                {inst.subdomain && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Public Address</label>
                    <p style={{ fontWeight: '600', color: 'var(--accent)' }}>{inst.subdomain}</p>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                 <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>View Console &rarr;</button>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
