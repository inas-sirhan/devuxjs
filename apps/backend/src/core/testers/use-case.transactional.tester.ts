import type { Newable } from 'inversify';
import type * as z from 'zod';
import type { Responses, ResponseShape } from '@/core/types/core.types';
import type { DatabaseTransactionState } from '@/core/core-injectables/database/database-transaction-manager/database-transaction-manager.base';
import type { IDatabaseTransactionManager } from '@/core/core-injectables/database/database-transaction-manager/database-transaction-manager.interface';
import { DatabaseTransactionManagerDiToken } from '@/core/core-injectables/database/database-transaction-manager/database-transaction-manager.inversify.tokens';
import { MockDatabaseTransactionManager } from '@/core/testers/mocks/database-transaction-manager.mock';
import { UseCaseTesterBase } from '@/core/testers/use-case.base.tester';
import { ApiError } from '@packages/shared-core/utils/define-api-error';
import { ApiErrors } from '@packages/shared-app/api-errors/api-errors';


export abstract class TransactionalUseCaseTester<
    TDeps extends Record<string, unknown>,
    TRequest,
    TResponses extends Responses,
> extends UseCaseTesterBase<TDeps, TRequest, TResponses> {

    private shouldSkipNextCheck = false;

    public skipNextStatusCodeToTransactionStateCheck(): void {
        this.shouldSkipNextCheck = true;
    }

    public useMockDatabaseTransactionManager(useMock: boolean): void {
        if (useMock === true) {
            this.replace('database-transaction-manager' as keyof TDeps).withClass(MockDatabaseTransactionManager as any);
        }
        else {
            this.clearReplacement('database-transaction-manager' as keyof TDeps);
        }
    }

    public override async execute<K extends keyof TResponses>(
        input: TRequest,
        expectedResponseKey: K
    ): Promise<z.infer<TResponses[K]['schema']>['body']>;

    public override async execute<K extends keyof typeof ApiErrors>(
        input: TRequest,
        errorClass: typeof ApiError,
        expectedApiErrorKey: K
    ): Promise<z.infer<(typeof ApiErrors)[K]['schema']>>;

    public override async execute<E extends Error>(
        input: TRequest,
        errorClass: Newable<E>
    ): Promise<E>;

    public override async execute(
        input: TRequest,
        responseKeyOrErrorClass: keyof TResponses | Newable<Error>,
        apiErrorKey?: keyof typeof ApiErrors
    ): Promise<ResponseShape['body'] | Error> {
        const checkFlag = this.shouldSkipNextCheck === false;
        this.shouldSkipNextCheck = false;

        const result = await super.execute(input, responseKeyOrErrorClass as any, apiErrorKey as any);

        if (checkFlag === true && typeof responseKeyOrErrorClass === 'string') {
            const expectedResponseKey = responseKeyOrErrorClass;
            const schema = this.config.responses[expectedResponseKey].schema;
            const statusCode = schema.shape.statusCode.value;

            try {
                if (statusCode >= 200 && statusCode < 300) {
                    this.assertIsCommitted();
                }
                else {
                    this.assertIsRolledback();
                }
            }
            catch {
                const expectedState = statusCode >= 200 && statusCode < 300 ? 'committed' : 'rolledback';
                const actualState = this.getTransactionState();
                throw new Error(
                    `Transaction state mismatch for '${expectedResponseKey}' (status ${statusCode}):\n` +
                    `  Expected: ${expectedState}\n` +
                    `  Actual: ${actualState}\n` +
                    `Use skipNextStatusCodeToTransactionStateCheck() if this is intentional.`
                );
            }
        }
        return result;
    }

    public getTransactionState(): DatabaseTransactionState {
        if (this.lastContainer === null) {
            throw new Error('Cannot call getTransactionState() before execute() (container is null)');
        }
        const txManager = this.lastContainer.get<IDatabaseTransactionManager>(DatabaseTransactionManagerDiToken);
        return txManager.getState();
    }

    public assertIsCommitted(): void {
        const state = this.getTransactionState();
        if (state !== 'committed') {
            throw new Error(`Expected transaction to be committed, but was '${state}'`);
        }
    }

    public assertIsRolledback(): void {
        const state = this.getTransactionState();
        if (state !== 'rolledback') {
            throw new Error(`Expected transaction to be rolledback, but was '${state}'`);
        }
    }
}
