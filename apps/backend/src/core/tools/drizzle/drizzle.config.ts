import '@/core/utils/load-env';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    schema: './src/infrastructure/database/drizzle/tables/**/*.drizzle.table.ts',
    out: './drizzle',
    dialect: 'postgresql',
    dbCredentials: {
      url: process.env.DATABASE_URL!,
    },
});