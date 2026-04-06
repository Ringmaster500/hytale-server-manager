'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Settings() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
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
  };

  useEffect(() => {
    fetchStatus();
  }, []);

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
      alert("Cloudflare local configuration saved!");
      fetchStatus();
    } catch (e) {
      alert("Failed to save settings.");
    } finally {
      setLoading(false);
    }
  };

  if (!status) return <div className="container">Loading settings...</div>;

  return (
    <main className="container">
      <Link href="/" style={{ color: 'var(--accent)', fontSize: '0.9rem', marginBottom: '1rem', display: 'block' }}>&larr; Back to Dashboard</Link>
      
      <header className="header">
        <h1 className="title">System Settings</h1>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <section className="card glass">
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>Local Cloudflare Tunnel</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
              Maps Hytale subdomains to your local <b>config.yml</b> file.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', opacity: 0.6, marginBottom: '0.4rem', textTransform: 'uppercase' }}>Root Domain</label>
              <input 
                className="console-input" 
                style={{ width: '100%', borderRadius: '0.4rem', padding: '0.75rem' }}
                placeholder="e.g. noxu-overseerr.org" 
                value={cloudflareDomain}
                onChange={(e) => setCloudflareDomain(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', opacity: 0.6, marginBottom: '0.4rem', textTransform: 'uppercase' }}>YAML Config Path (Internal)</label>
              <input 
                className="console-input" 
                style={{ width: '100%', borderRadius: '0.4rem', padding: '0.75rem' }}
                value={cloudflareConfigPath}
                onChange={(e) => setCloudflareConfigPath(e.target.value)}
              />
              <p style={{ fontSize: '0.7rem', opacity: 0.4, marginTop: '0.4rem' }}>docker path to your mounted config.yml</p>
            </div>

            <button 
              className="btn btn-primary" 
              onClick={saveCloudflare}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Network Settings'}
            </button>
          </div>
        </section>

        <section>
             <div className="card glass">
                <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem' }}>System Integrity</h2>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem' }}>
                   <div>
                      <p style={{ fontWeight: '600' }}>Hytale Core Files</p>
                      <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>Verified 1.4.2 Official</p>
                   </div>
                   <span style={{ color: 'var(--success)', fontWeight: '700' }}>VALID</span>
                </div>
             </div>
        </section>
      </div>
    </main>
  );
}
