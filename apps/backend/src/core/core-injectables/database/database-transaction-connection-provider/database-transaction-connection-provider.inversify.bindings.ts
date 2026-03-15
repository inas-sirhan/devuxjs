import type { RequestContainer } from '@/core/containers/request-container';
import { DatabaseTransactionConnectionProvider } from '@/core/core-injectables/database/database-transaction-connection-provider/database-transaction-connection-provider';
import type { IDatabaseTransactionConnectionProvider } from '@/core/core-injectables/database/database-transaction-connection-provider/database-transaction-connection-provider.interface';
import { DatabaseTransactionConnectionProviderDiToken } from '@/core/core-injectables/database/database-transaction-connection-provider/database-transaction-connection-provider.inversify.tokens';



export function setupDatabaseTransactionConnectionProviderBindings(requestContainer: RequestContainer) {
    requestContainer.bindRequestSingleton<IDatabaseTransactionConnectionProvider>(DatabaseTransactionConnectionProviderDiToken, DatabaseTransactionConnectionProvider);
}

