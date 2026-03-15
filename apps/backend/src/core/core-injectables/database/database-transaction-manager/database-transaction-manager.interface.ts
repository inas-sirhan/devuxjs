import type { DatabaseTransactionState } from '@/core/core-injectables/database/database-transaction-manager/database-transaction-manager.base';
import type { WithTransactionInput } from '@/core/core-injectables/database/database-transaction-manager/database-transaction-manager.types';


export interface IDatabaseTransactionManager {
    withTransaction<T>(input: WithTransactionInput<T>): Promise<T>;
    getState(): DatabaseTransactionState;
    isActive(): boolean;
    commit(): Promise<void>;
    rollback(): Promise<void>;
}