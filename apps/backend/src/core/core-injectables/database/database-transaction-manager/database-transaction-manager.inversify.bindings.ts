import type { RequestContainer } from '@/core/containers/request-container';
import type { IDatabaseTransactionManager } from '@/core/core-injectables/database/database-transaction-manager/database-transaction-manager.interface';
import { DatabaseTransactionManagerDiToken } from '@/core/core-injectables/database/database-transaction-manager/database-transaction-manager.inversify.tokens';
import { DatabaseTransactionManager } from '@/infrastructure/core/database/database-transaction-manager';



export function setupDatabaseTransactionManagerBindings(requestContainer: RequestContainer): void {
    requestContainer.bindRequestSingleton<IDatabaseTransactionManager>(DatabaseTransactionManagerDiToken, DatabaseTransactionManager);
}

