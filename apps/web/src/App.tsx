import { useEffect, useState } from 'react';

const API = __API_URL__;

// The shapes the API sends back (see apps/api/src/index.ts and usage.ts).
// TypeScript can't check these against the real response: they're a promise, not a guarantee.
type Meter = { id: string; fuel: string; unit: string };
type Period = {
  from: string;
  to: string;
  usage: number | null; // null when suspect
  rollover: boolean;
  suspect: boolean;
  usage_kwh: number | null; // usage in kWh (gas converted from m3); null when suspect
  difference: number | null; // usage_kwh - 250; null if not checked
  over: boolean | null; // null if not checked (longer than 7 days, or suspect)
};
type Usage = { meter_id: string; fuel: string; unit: string; periods: Period[] };

// Each fetch is in exactly one of these states, so the page can't show "loading" and an error at once.
type Load<T> =
  { status: 'loading' } | { status: 'error'; message: string } | { status: 'loaded'; data: T };

// fetch only rejects when the API can't be reached; a 404 or 500 still "succeeds".
// So check res.ok and turn an error reply into a thrown Error too.
async function getJson<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`);
  } catch {
    throw new Error('cannot reach the API — is it running?');
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? `API returned ${res.status}`);
  return body as T;
}

export function App() {
  const [meters, setMeters] = useState<Load<Meter[]>>({ status: 'loading' });
  const [meterId, setMeterId] = useState('');

  // Load the meter list once, when the page opens.
  useEffect(() => {
    getJson<Meter[]>('/meters')
      .then((data) => setMeters({ status: 'loaded', data }))
      .catch((err: Error) => setMeters({ status: 'error', message: err.message }));
  }, []);

  return (
    <main>
      <h1>Volta</h1>
      {meters.status === 'loading' && <p>Loading meters…</p>}
      {meters.status === 'error' && <p role="alert">Could not load meters: {meters.message}</p>}
      {meters.status === 'loaded' && (
        <>
          <label>
            Meter{' '}
            <select value={meterId} onChange={(e) => setMeterId(e.target.value)}>
              <option value="">Choose a meter</option>
              {meters.data.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id} ({m.fuel}, {m.unit})
                </option>
              ))}
            </select>
          </label>
          {meterId && <UsageTable meterId={meterId} />}
        </>
      )}
    </main>
  );
}

function UsageTable({ meterId }: { meterId: string }) {
  const [usage, setUsage] = useState<Load<Usage>>({ status: 'loading' });

  // Runs whenever meterId changes. If the user picks another meter before this fetch
  // returns, the cleanup sets ignore = true so the slower, out-of-date reply is dropped.
  useEffect(() => {
    let ignore = false;
    setUsage({ status: 'loading' });
    getJson<Usage>(`/meters/${encodeURIComponent(meterId)}/usage`)
      .then((data) => !ignore && setUsage({ status: 'loaded', data }))
      .catch((err: Error) => !ignore && setUsage({ status: 'error', message: err.message }));
    return () => {
      ignore = true;
    };
  }, [meterId]);

  if (usage.status === 'loading') return <p>Loading usage…</p>;
  if (usage.status === 'error') return <p role="alert">Could not load usage: {usage.message}</p>;

  const { periods, unit } = usage.data;
  // Usage needs two readings, so a meter with zero or one reading has no periods.
  if (periods.length === 0) return <p>No usage recorded for {meterId} yet.</p>;
  // Electricity is already in kWh, so a second kWh column would only repeat the first.
  const showKwh = unit !== 'kWh';

  return (
    // cellPadding is a plain HTML attribute: enough to keep columns apart without any CSS.
    <table cellPadding={8}>
      <thead>
        <tr>
          <th>From</th>
          <th>To</th>
          <th>Usage ({unit})</th>
          {showKwh && <th>Usage (kWh)</th>}
          <th>vs 250 kWh</th>
          <th>Over?</th>
        </tr>
      </thead>
      <tbody>
        {periods.map((p) => (
          <tr key={p.from}>
            <td>{p.from}</td>
            <td>{p.to}</td>
            <td>{p.suspect || p.usage === null ? 'suspect reading' : p.usage.toFixed(2)}</td>
            {showKwh && <td>{p.usage_kwh === null ? '—' : p.usage_kwh.toFixed(2)}</td>}
            <td>{p.difference === null ? '—' : p.difference.toFixed(2)}</td>
            <td>{p.over === null ? 'not checked' : p.over ? 'yes' : 'no'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
