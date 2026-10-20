import { useEffect, useState } from 'react';

const API = __API_URL__;

// Proof the two apps talk to each other. Replace this with your own UI.
export function App() {
  const [status, setStatus] = useState('checking…');

  useEffect(() => {
    fetch(`${API}/health`)
      .then((r) => r.json())
      .then((d) => setStatus(d.ok ? 'connected' : 'unexpected response'))
      .catch(() => setStatus('cannot reach the API — is it running?'));
  }, []);

  return (
    <main>
      <h1>Volta</h1>
      <p>API: {status}</p>
    </main>
  );
}
