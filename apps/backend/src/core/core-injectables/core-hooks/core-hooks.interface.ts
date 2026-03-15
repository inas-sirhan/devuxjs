
import type { Request } from 'express';
import type * as z from 'zod';


export interface ICoreHooks {
    onSerializationError(context: SerializationErrorContext): void;
    onDeadlockError(context: DeadlockErrorContext): void;
    onTransactionStartError(context: TransactionStartErrorContext): void;
    onSafeRollbackError(context: SafeRollbackErrorContext): void;
    onSlowUseCase(context: SlowUseCaseContext): void;
    onSlowRepo(context: SlowRepoContext): void;
    onSlowDomainService(context: SlowDomainServiceContext): void;
    onValidationError(context: ValidationErrorContext): void;
}

export type SerializationErrorContext = {
    req: Request;
    attemptNumber: number;
    maxAttempts: number;
    error: unknown;
};

export type DeadlockErrorContext = {
    req: Request;
    attemptNumber: number;
    maxAttempts: number;
    error: unknown;
};

export type TransactionStartErrorContext = {
    req: Request;
    attemptNumber: number;
    maxAttempts: number;
    error: unknown;
};

export type SafeRollbackErrorContext = {
    req: Request;
    error: unknown;
};

export type SlowUseCaseContext = {
    req: Request;
    useCaseName: string;
    executionTimeMillis: number;
    durationThresholdMillis: number;
};

export type SlowRepoContext = {
    req: Request;
    repoName: string;
    executionTimeMillis: number;
    durationThresholdMillis: number;
};

export type SlowDomainServiceContext = {
    req: Request;
    domainServiceName: string;
    executionTimeMillis: number;
    durationThresholdMillis: number;
};

export type ValidationErrorContext = {
    req: Request;
    validatorName: string;
    input: unknown;
    zodError: z.ZodError;
};

