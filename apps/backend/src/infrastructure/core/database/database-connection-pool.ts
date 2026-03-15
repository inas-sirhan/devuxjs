import type { DatabaseTypes } from '@/infrastructure/core/database/database.types';
import { kyselyDatabaseClient } from '@/infrastructure/database/kysely/kysely.database';


export const databaseConnectionPool: DatabaseTypes['ConnectionPool'] = kyselyDatabaseClient;

