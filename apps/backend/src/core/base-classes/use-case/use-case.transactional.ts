import { UseCaseBase } from '@/core/base-classes/use-case/use-case.base';
import { coreConfig } from '@/infrastructure/core/core.config';
import type { TransactionAccessMode, TransactionIsolationLevel } from '@/core/core-injectables/database/database-transaction-manager/database-transaction-manager.types';
import type { IDatabaseTransactionManager } from '@/core/core-injectables/database/database-transaction-manager/database-transaction-manager.interface';
import { injectDatabaseTransactionManager } from '@/core/core-injectables/database/database-transaction-manager/database-transaction-manager.inversify.tokens';
import { fullInjectable } from '@/core/utils/core.utils';

@fullInjectable()
export abstract class TransactionalUseCase<TRequest> extends UseCaseBase<TRequest> {

    @injectDatabaseTransactionManager() protected readonly transactionManager!: IDatabaseTransactionManager;

    protected abstract getIsolationLevel(): TransactionIsolationLevel;

    protected abstract getAccessMode(): TransactionAccessMode;

    protected getTransactionMaxAttempts(): number {
        return coreConfig.transactionMaxAttempts;
    }

 
    protected getTransactionBaseDelayMillis(): number {
        return coreConfig.baseDelayBetweenTransactionRetriesMillis;
    }

    protected async executeInternal(input: TRequest): Promise<void> {
        await this.transactionManager.withTransaction({
            isolationLevel: this.getIsolationLevel(),
            accessMode: this.getAccessMode(),
            maxAttempts: this.getTransactionMaxAttempts(),
            baseDelayMillis: this.getTransactionBaseDelayMillis(),
            operation: async () => {
                await this._execute(input);
            }
        });
    }


    protected async commit(): Promise<void> {
        await this.transactionManager.commit();
    }

    protected async rollback(): Promise<void> {
        await this.transactionManager.rollback();
    }
}
