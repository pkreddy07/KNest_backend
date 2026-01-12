import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                leaderboard: resolve(__dirname, 'leaderboard.html'),
                profile: resolve(__dirname, 'profile.html'),
                viewProfile: resolve(__dirname, 'view-profile.html'),
            },
        },
    },
});
