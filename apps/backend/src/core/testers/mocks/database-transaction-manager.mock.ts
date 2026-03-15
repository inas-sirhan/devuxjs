import type { IDatabaseTransactionManager } from '@/core/core-injectables/database/database-transaction-manager/database-transaction-manager.interface';
import type { DatabaseTransactionState } from '@/core/core-injectables/database/database-transaction-manager/database-transaction-manager.base';
import type { WithTransactionInput } from '@/core/core-injectables/database/database-transaction-manager/database-transaction-manager.types';
import { injectable } from 'inversify';


@injectable()
export class MockDatabaseTransactionManager implements IDatabaseTransactionManager {

    private state: DatabaseTransactionState = 'not-started';

    public async withTransaction<T>(input: WithTransactionInput<T>): Promise<T> {
        this.state = 'active';
        const result = await input.operation();

        const state = this.state as DatabaseTransactionState;
        if (state !== 'committed' && state !== 'rolledback') {
            throw new Error('Transaction completed but was not committed or rolled back');
        }

        return result;
    }

    public getState(): DatabaseTransactionState {
        return this.state;
    }

    public isActive(): boolean {
        return this.state === 'active';
    }

    public async commit(): Promise<void> {
        if (this.state !== 'active') {
            throw new Error(`Cannot commit: transaction is '${this.state}', expected 'active'`);
        }
        this.state = 'committed';
    }

    public async rollback(): Promise<void> {
        if (this.state !== 'active') {
            throw new Error(`Cannot rollback: transaction is '${this.state}', expected 'active'`);
        }
        this.state = 'rolledback';
    }
}
