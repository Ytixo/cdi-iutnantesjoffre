import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './', // Permet l'hébergement direct sur GitHub Pages avec chemins relatifs
  plugins: [react()],
  server: {
    port: 3000,
    host: true, // Permet d'accéder depuis le smartphone / réseau local
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
});
