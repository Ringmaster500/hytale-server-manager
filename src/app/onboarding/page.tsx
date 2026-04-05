'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Onboarding() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
    domain: '',
  });

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(async () => {
       try {
         const res = await fetch('/api/logs');
         const data = await res.json();
         setLogs(data.logs);
         
         // If "successfully downloaded" appears, we are done
         if (data.logs.some((l: string) => l.includes('downloaded successfully'))) {
            router.push('/');
         }
       } catch (e) {}
    }, 2000);
    return () => clearInterval(interval);
  }, [loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      
      if (res.ok) {
        // Now we just wait for the logs to show success
      } else {
        const error = await res.json();
        alert(`Setup failed: ${error.message}`);
        setLoading(false);
      }
    } catch (e) {
      alert('An error occurred during setup');
      setLoading(false);
    }
  };

  return (
    <main className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="card glass" style={{ width: '600px', padding: '3rem' }}>
        <h1 className="title" style={{ fontSize: '1.75rem', marginBottom: '1.5rem', textAlign: 'center' }}>Welcome to Hytale Manager</h1>
        <p style={{ textAlign: 'center', marginBottom: '2rem', opacity: 0.6 }}>Onboard your account to retrieve official binaries and updates automatically.</p>
        
        {!loading ? (
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
              <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.5rem', opacity: 0.8 }}>SERVER DOMAIN (Optional)</label>
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
            >
              Finalize Setup
            </button>
          </form>
        ) : (
          <div>
             <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--accent)' }}>System Initialization...</h3>
             <div className="console" style={{ height: '300px', fontSize: '0.75rem' }}>
               {logs.map((log, i) => <div key={i}>{log}</div>)}
             </div>
             <p style={{ marginTop: '1rem', fontSize: '0.8rem', opacity: 0.6 }}>
               Please monitor the console above. If you see an authentication URL, open it and enter the provided code.
             </p>
             <button className="btn btn-secondary" style={{ marginTop: '1.5rem', width: '100%', justifyContent: 'center' }} onClick={() => window.location.reload()}>
               Retry / Cancel
             </button>
          </div>
        )}
      </div>
    </main>
  );
}
