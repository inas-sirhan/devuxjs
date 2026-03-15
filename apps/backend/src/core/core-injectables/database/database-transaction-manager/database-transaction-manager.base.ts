import { injectable } from 'inversify';
import { sleep } from '@/core/utils/core.utils';
import { checkDatabaseError } from '@/infrastructure/core/database/database-error-checker';
import type { RequestContext } from '@/core/core-injectables/request-context/request-context.type';
import { injectRequestContext } from '@/core/core-injectables/request-context/request-context.inversify.tokens';
import { injectDatabaseConnectionPool } from '@/core/core-injectables/database/database-connection-pool/database-connection-pool.inversify.tokens';
import type { DatabaseConnectionPool } from '@/core/core-injectables/database/database-connection-pool/database-connection-pool.type';
import type { IDatabaseTransactionManager } from '@/core/core-injectables/database/database-transaction-manager/database-transaction-manager.interface';
import { injectDatabaseTransactionConnectionProvider } from '@/core/core-injectables/database/database-transaction-connection-provider/database-transaction-connection-provider.inversify.tokens';
import type { IDatabaseTransactionConnectionProvider } from '@/core/core-injectables/database/database-transaction-connection-provider/database-transaction-connection-provider.interface';
import type { ICoreHooks } from '@/core/core-injectables/core-hooks/core-hooks.interface';
import type { DatabaseTransactionConnection, TransactionAccessMode, TransactionIsolationLevel, WithTransactionInput } from '@/core/core-injectables/database/database-transaction-manager/database-transaction-manager.types';
import { injectCoreHooks } from '@/core/core-injectables/core-hooks/core-hooks.inversify.tokens';


export type DatabaseTransactionState = 'not-started' | 'active' | 'committed' | 'rolledback' | 'error-commit' | 'error-rollback';

@injectable()
export abstract class DatabaseTransactionManagerBase implements IDatabaseTransactionManager {

    @injectDatabaseConnectionPool() protected readonly connectionPool!: DatabaseConnectionPool;
    @injectDatabaseTransactionConnectionProvider() private readonly connectionProvider!: IDatabaseTransactionConnectionProvider;
    @injectCoreHooks() private readonly coreHooks!: ICoreHooks;
    @injectRequestContext() protected readonly requestContext!: RequestContext;

    private _connection: DatabaseTransactionConnection | null = null;
    protected state: DatabaseTransactionState = 'not-started';

    protected abstract startTransactionInternal(isolationLevel: TransactionIsolationLevel, accessMode: TransactionAccessMode): Promise<DatabaseTransactionConnection>;
    protected abstract commitInternal(): Promise<void>;
    protected abstract rollbackInternal(): Promise<void>;

    protected async onTransactionStarted(): Promise<void> {

    }

    private getRetryDelayMillisForCurrentAttempt(currentAttempt: number, baseDelayMillis: number): number {
        const jitter = Math.random() * baseDelayMillis;
        return baseDelayMillis * Math.pow(2, currentAttempt - 1) + jitter;
    }

    private async sleepBeforeRetry(currentAttempt: number, baseDelayMillis: number): Promise<void> {
        const currentDelay = this.getRetryDelayMillisForCurrentAttempt(currentAttempt, baseDelayMillis);
        await sleep(currentDelay);
    }

    public get connection(): DatabaseTransactionConnection {
        if (this._connection === null) {
            throw new Error('No active transaction connection');
        }
        return this._connection;
    }

    public getState(): DatabaseTransactionState {
        return this.state;
    }

    public isActive(): boolean {
        return this.state === 'active';
    }

    public async commit(): Promise<void> {
        if (this.connection === null) {
            throw new Error('[Commit Error]: No active transaction');
        }
        if (this.isActive() === false) {
            throw new Error(`[ERROR Commit Transaction]: Transaction is not active.. there may be a bug here. Current transaction state is: ${this.state}`);
        }

        try {
            await this.commitInternal();
            this.state = 'committed';
        }
        catch (error: unknown) {
            this.state = 'error-commit';
            throw error;
        }
    }

    public async rollback(): Promise<void> {
        if (this.connection === null) {
            throw new Error('[Rollback Error]: No active transaction');
        }
        if (this.isActive() === false) {
            throw new Error(`[ERROR Rollback Transaction]: Transaction is not active.. there may be a bug here. Current transaction state is: ${this.state}`);
        }

        try {
            await this.rollbackInternal();
            this.state = 'rolledback';
        }
        catch (error: unknown) {
            this.state = 'error-rollback';
            throw error;
        }
    }

    private async safeRollback(): Promise<void> {
        if (this.isActive() === false) {
            return;
        }
        try {
            await this.rollback();
        }
        catch (error: unknown) {
            this.coreHooks.onSafeRollbackError({
                req: this.requestContext.req,
                error,
            });
        }
    }

    public async withTransaction<T>(input: WithTransactionInput<T>): Promise<T> {
        let explicitContinueFlag: boolean = true;
        const { maxAttempts, baseDelayMillis } = input;

        for (let currentAttempt = 1; explicitContinueFlag === true && currentAttempt <= maxAttempts; currentAttempt++) {
            explicitContinueFlag = false;

            if (currentAttempt > 1) {
                await this.sleepBeforeRetry(currentAttempt, baseDelayMillis);
            }

            this._connection = null;
            this.state = 'not-started';

            try {
                this._connection = await this.startTransactionInternal(input.isolationLevel, input.accessMode);
            }
            catch (error: unknown) {
                this.coreHooks.onTransactionStartError({
                    req: this.requestContext.req,
                    attemptNumber: currentAttempt,
                    maxAttempts,
                    error,
                });
                explicitContinueFlag = true;
                continue; 
            }

            this.state = 'active';

            this.connectionProvider.setTransactionConnection(this.connection);

            try {
                await this.onTransactionStarted();

                const result = await input.operation();

                const currentState = this.state as DatabaseTransactionState;
                if (currentState === 'committed' || currentState === 'rolledback') {
                    return result;
                } 
                else {
                    await this.safeRollback();
                    throw new Error(`[Transaction Error]: Usecase completed with unfinished state. Must either commit or rollback.. Current state is ${currentState}`);
                }
            } 
            catch (error: unknown) {
                await this.safeRollback();
                const errorType = checkDatabaseError(error);
                if (errorType.type === 'serialization' || errorType.type === 'deadlock') {
                    if (errorType.type === 'serialization') {
                        this.coreHooks.onSerializationError({
                            req: this.requestContext.req,
                            attemptNumber: currentAttempt,
                            maxAttempts,
                            error,
                        });
                    }
                    else {
                        this.coreHooks.onDeadlockError({
                            req: this.requestContext.req,
                            attemptNumber: currentAttempt,
                            maxAttempts,
                            error,
                        });
                    }
                    explicitContinueFlag = true;
                    continue; 
                }
                throw error;
            }
        }

        throw new Error(`[With Transaction Error]: Max Attempts Reached. Max is: ${maxAttempts}`);
    }
}
