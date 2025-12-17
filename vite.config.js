import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api-football': {
          target: 'https://v3.football.api-sports.io/',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api-football/, ''),
          headers: {
            // Usamos la variable cargada desde el .env
            'X-RapidAPI-Key': env.VITE_API_FOOTBALL_KEY,
          },
        },
      },
    },
  };
});