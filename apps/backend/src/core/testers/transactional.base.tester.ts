import type { Container } from 'inversify';
import type { IDatabaseTransactionManager } from '@/core/core-injectables/database/database-transaction-manager/database-transaction-manager.interface';
import { DatabaseTransactionManagerDiToken } from '@/core/core-injectables/database/database-transaction-manager/database-transaction-manager.inversify.tokens';
import type { TransactionAccessMode, TransactionIsolationLevel } from '@/core/core-injectables/database/database-transaction-manager/database-transaction-manager.types';
import { TesterBase } from '@/core/testers/tester.base';


export abstract class TransactionalTesterBase<
    TDeps extends Record<string, unknown>,
> extends TesterBase<TDeps> {

    private isolationLevel: TransactionIsolationLevel = 'read-committed';
    private accessMode: TransactionAccessMode = 'read-write';

    public constructor(validDeps: ReadonlySet<string>) {
        super(validDeps);
    }

    public setIsolationLevel(level: TransactionIsolationLevel): this {
        this.isolationLevel = level;
        return this;
    }

    public setAccessMode(mode: TransactionAccessMode): this {
        this.accessMode = mode;
        return this;
    }

    protected async executeInTransaction<T>(
        container: Container,
        operation: () => Promise<T>,
    ): Promise<T> {
        const txManager = container.get<IDatabaseTransactionManager>(DatabaseTransactionManagerDiToken);

        return await txManager.withTransaction({
            isolationLevel: this.isolationLevel,
            accessMode: this.accessMode,
            maxAttempts: 1,
            baseDelayMillis: 0,
            operation: async () => {
                const result = await operation();
                await txManager.commit();
                return result;
            },
        });
    }
}
