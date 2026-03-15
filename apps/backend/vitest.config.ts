import { defineConfig } from 'vitest/config';
import path from 'path';


export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@api': path.resolve(__dirname, './api'),
            '@packages/shared-core': path.resolve(__dirname, '../../packages/shared/src/shared-core'),
            '@packages/shared-app': path.resolve(__dirname, '../../packages/shared/src/shared-app'),
        },
    },
    test: {
        setupFiles: ['./vitest.setup.ts'],
        testTimeout: 60_000,
        bail: 3,
        globals: false,
        environment: 'node',    
        coverage: {
          provider: 'v8',
          reporter: ['text', 'lcov', 'html'],
        },
        sequence: {
          concurrent: false, 
          shuffle: true,
        },
        fileParallelism: false, 
    },
});
