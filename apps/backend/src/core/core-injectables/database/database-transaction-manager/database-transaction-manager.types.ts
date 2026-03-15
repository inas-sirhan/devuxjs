

export type TransactionIsolationLevel = 'read-committed' | 'repeatable-read' | 'serializable';
export type TransactionAccessMode = 'read-only' | 'read-write';


export type WithTransactionInput<T> = {
    operation: () => Promise<T>;
    isolationLevel: TransactionIsolationLevel;
    accessMode: TransactionAccessMode;
    maxAttempts: number;
    baseDelayMillis: number;
};



import type { DatabaseTypes } from '@/infrastructure/core/database/database.types';

export type DatabaseTransactionConnection = DatabaseTypes['TransactionConnection'];
