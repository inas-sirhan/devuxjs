
import type { AppContainer } from '@/core/containers/app-container';
import { DatabaseConnectionPoolDiToken } from '@/core/core-injectables/database/database-connection-pool/database-connection-pool.inversify.tokens';
import type { DatabaseConnectionPool } from '@/core/core-injectables/database/database-connection-pool/database-connection-pool.type';
import { databaseConnectionPool } from '@/infrastructure/core/database/database-connection-pool';


export function setupDatabaseConnectionPoolBindings(appContainer: AppContainer) {
    appContainer.bindGlobalConstantValue<DatabaseConnectionPool>(DatabaseConnectionPoolDiToken, databaseConnectionPool);
}

