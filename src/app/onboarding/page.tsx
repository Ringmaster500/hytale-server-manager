'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Onboarding() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
    domain: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      
      if (res.ok) {
        router.push('/');
      } else {
        const error = await res.json();
        alert(`Setup failed: ${error.message}`);
      }
    } catch (e) {
      alert('An error occurred during setup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="card glass" style={{ width: '450px', padding: '3rem' }}>
        <h1 className="title" style={{ fontSize: '1.75rem', marginBottom: '1.5rem', textAlign: 'center' }}>Welcome to Hytale Manager</h1>
        <p style={{ textAlign: 'center', marginBottom: '2rem', opacity: 0.6 }}>Onboard your account to retrieve official binaries and updates automatically.</p>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.5rem', opacity: 0.8 }}>HYTALE ACCOUNT EMAIL</label>
            <input 
              className="console-input" 
              style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}
              type="email" 
              required 
              value={credentials.username}
              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.5rem', opacity: 0.8 }}>PASSWORD / ACCESS TOKEN</label>
            <input 
              className="console-input" 
              style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}
              type="password" 
              required 
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              placeholder="••••••••"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.5rem', opacity: 0.8 }}>SERVER DOMAIN (Optional for Cloudflare)</label>
            <input 
              className="console-input" 
              style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}
              type="text" 
              value={credentials.domain}
              onChange={(e) => setCredentials({ ...credentials, domain: e.target.value })}
              placeholder="hytale.example.com"
            />
          </div>

          <button 
            className="btn btn-primary" 
            style={{ marginTop: '1rem', justifyContent: 'center' }}
            disabled={loading}
          >
            {loading ? 'Initializing CLI...' : 'Finalize Setup'}
          </button>
        </form>
      </div>
    </main>
  );
}
