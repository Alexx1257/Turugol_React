// vite.config.js

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Reemplaza YOUR_API_FOOTBALL_KEY con tu clave de API-Football
// Esta clave la obtienes al registrarte en el plan gratuito.
const API_FOOTBALL_KEY = '519886d6843dc8d1e6c9ebd74ba34f45'; 

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 🚨 Configuración de proxy para API-Football 🚨
      '/api-football': {
        // La URL base para la API de API-Football
        target: 'https://v3.football.api-sports.io/', 
        changeOrigin: true,
        secure: true,
        
        // La reescritura elimina '/api-football' de la ruta antes de enviarla al target
        rewrite: (path) => path.replace(/^\/api-football/, ''),
        
        // 🔑 Añadir la clave de API-Football al Header de la petición
        headers: {
          // El nombre del encabezado de autenticación es X-RapidAPI-Key
          'X-RapidAPI-Key': API_FOOTBALL_KEY, 
        },
      },
      // Elimina o comenta cualquier otra configuración de proxy que no uses
    },
  },
});