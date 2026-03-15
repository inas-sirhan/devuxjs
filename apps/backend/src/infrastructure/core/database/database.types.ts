import type { KyselyDatabaseConnectionPool, KyselyDatabaseTransactionConnection } from '@/infrastructure/database/kysely/kysely.database';


export type DatabaseTypes = {
    ConnectionPool: KyselyDatabaseConnectionPool;
    TransactionConnection: KyselyDatabaseTransactionConnection;
};

