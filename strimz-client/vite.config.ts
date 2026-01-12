import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  base: "./",
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks for large libraries
          if (id.includes('node_modules')) {
            // Video player library
            if (id.includes('@vidstack')) {
              return 'vidstack';
            }
            // Animation library
            if (id.includes('framer-motion')) {
              return 'framer-motion';
            }
            // UI libraries
            if (id.includes('@radix-ui') || id.includes('@headlessui')) {
              return 'ui-libs';
            }
            // Redux
            if (id.includes('@reduxjs') || id.includes('react-redux')) {
              return 'redux';
            }
            // Router
            if (id.includes('react-router')) {
              return 'router';
            }
            // Socket.io
            if (id.includes('socket.io')) {
              return 'socket';
            }
            // Icons
            if (id.includes('react-icons') || id.includes('lucide-react') || id.includes('media-icons')) {
              return 'icons';
            }
            // Other large vendor libraries
            if (id.includes('axios') || id.includes('lodash')) {
              return 'utils';
            }
            // Default vendor chunk for remaining node_modules
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})
