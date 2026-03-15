import { defineDiToken, createInjectFn } from '@/core/utils/di-tokens.core.utils';


export const DatabaseConnectionPoolDiToken = defineDiToken('DatabaseConnectionPool');
export const injectDatabaseConnectionPool = createInjectFn(DatabaseConnectionPoolDiToken);
