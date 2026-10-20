import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Same repo-root .env as the API. Only the derived URL reaches the browser, never the rest.
  const env = loadEnv(mode, '../..', '');
  for (const name of ['PORT', 'WEB_PORT']) {
    if (!env[name]) {
      throw new Error(`${name} is not set. Copy .env.example to .env at the repo root.`);
    }
  }

  return {
    plugins: [react()],
    envDir: '../..',
    define: {
      __API_URL__: JSON.stringify(`http://localhost:${env.PORT}`),
    },
    server: { port: Number(env.WEB_PORT), strictPort: true },
  };
});
