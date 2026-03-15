import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
            '@packages/shared-core': path.resolve(__dirname, '../../packages/shared/src/shared-core'),
            '@packages/shared-app': path.resolve(__dirname, '../../packages/shared/src/shared-app'),
            '@packages/api': path.resolve(__dirname, '../../packages/shared/src/api'),
            '@packages/translation': path.resolve(__dirname, '../../packages/shared/src/translation')
        },
    },
});
