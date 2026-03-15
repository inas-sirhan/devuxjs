import type { AccessMode, IsolationLevel } from 'kysely';
import { fullInjectable } from '@/core/utils/core.utils';
import type { DatabaseTransactionConnection, TransactionAccessMode, TransactionIsolationLevel } from '@/core/core-injectables/database/database-transaction-manager/database-transaction-manager.types';
import { DatabaseTransactionManagerBase } from '@/core/core-injectables/database/database-transaction-manager/database-transaction-manager.base';


@fullInjectable()
export class DatabaseTransactionManager extends DatabaseTransactionManagerBase {

    protected async startTransactionInternal(
        isolationLevel: TransactionIsolationLevel,
        accessMode: TransactionAccessMode
    ): Promise<DatabaseTransactionConnection> {
        const transactionConnection = await this.connectionPool
        .startTransaction()
        .setIsolationLevel(mapToKyselyIsolationLevel(isolationLevel))
        .setAccessMode(mapToKyselyAccessMode(accessMode))
        .execute();
        return transactionConnection;
    }

    protected async commitInternal(): Promise<void> {
        await this.connection.commit().execute();
    }

    protected async rollbackInternal(): Promise<void> {
        await this.connection.rollback().execute();
    }

    //set RLS/session-variables here.
    protected override async onTransactionStarted(): Promise<void> {
        // use this.connection
        // use this.requestContext to access user/tenant data
    }

}

function mapToKyselyIsolationLevel(isolationLevel: TransactionIsolationLevel): IsolationLevel {
    if (isolationLevel === 'read-committed') {
        return 'read committed';
    }
    if (isolationLevel === 'repeatable-read') {
        return 'repeatable read';
    }
    if (isolationLevel === 'serializable') {
        return 'serializable';
    }
    throw new Error(`Unsupported isolation-level... received: "${isolationLevel}"`);
}

function mapToKyselyAccessMode(accessMode: TransactionAccessMode): AccessMode {
    if (accessMode === 'read-only') {
        return 'read only';
    }
    if (accessMode === 'read-write') {
        return 'read write';
    }
    throw new Error(`Unsupported access-mode... received: "${accessMode}"`);
}
