import { defineDiToken, createInjectFn } from '@/core/utils/di-tokens.core.utils';


export const DatabaseTransactionConnectionProviderDiToken = defineDiToken('DatabaseTransactionConnectionProvider');
export const injectDatabaseTransactionConnectionProvider = createInjectFn(DatabaseTransactionConnectionProviderDiToken);
