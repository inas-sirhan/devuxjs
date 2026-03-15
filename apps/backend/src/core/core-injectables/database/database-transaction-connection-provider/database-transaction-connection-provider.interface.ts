import type { DatabaseTransactionConnection } from '@/core/core-injectables/database/database-transaction-manager/database-transaction-manager.types';



export interface IDatabaseTransactionConnectionProvider {
    getTransactionConnection(): DatabaseTransactionConnection | null;
    setTransactionConnection(transactionConnection: DatabaseTransactionConnection): void;
}

