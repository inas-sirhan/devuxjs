import { defineDiToken, createInjectFn } from '@/core/utils/di-tokens.core.utils';


export const DatabaseTransactionManagerDiToken = defineDiToken('DatabaseTransactionManager');
export const injectDatabaseTransactionManager = createInjectFn(DatabaseTransactionManagerDiToken);
