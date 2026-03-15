import { injectable } from 'inversify';
import type { IRepo } from '@/core/base-classes/repo/repo.interface';
import type { ForeignKeyViolationErrorMap, RepoInput, RepoOutput, UniqueKeyViolationErrorMap } from '@/core/base-classes/repo/repo.types';
import type * as z from 'zod';
import { checkDatabaseError } from '@/infrastructure/core/database/database-error-checker';
import { coreConfig } from '@/infrastructure/core/core.config';
import type { RequestContext } from '@/core/core-injectables/request-context/request-context.type';
import { injectRequestContext } from '@/core/core-injectables/request-context/request-context.inversify.tokens';
import { injectCoreHooks } from '@/core/core-injectables/core-hooks/core-hooks.inversify.tokens';
import type { ICoreHooks } from '@/core/core-injectables/core-hooks/core-hooks.interface';
import { CoreZodUtils } from '@/core/utils/zod.core.utils';
import { type IUserContext } from '@/app-services/user-context/user-context.interface';
import { injectUserContext } from '@/__internals__/app-services/user-context/user-context.inversify.tokens';

@injectable()
export abstract class RepoBase<TInput extends RepoInput, TOutput extends RepoOutput> implements IRepo<TInput, TOutput> {

    @injectCoreHooks() private readonly coreHooks!: ICoreHooks;
    @injectRequestContext() private readonly requestContext!: RequestContext;
    @injectUserContext() protected readonly userContext!: IUserContext;
    protected abstract _execute(input: TInput): Promise<TOutput>;

    protected getDurationThresholdMillis(): number {
        return coreConfig.repoDurationThresholdMillis;
    }

    public async execute(input: TInput): Promise<TOutput> {
        const start = performance.now();

        try {
            if (coreConfig.isProduction === false) {
                if (coreConfig.assertNoMutationsInInternalSchemas === true) {
                    CoreZodUtils.assertNoMutationsOnce(this.getRepoInputZodSchema(), `${this.constructor.name}'s input schema`);
                    CoreZodUtils.assertNoMutationsOnce(this.getRepoOutputZodSchema(), `${this.constructor.name}'s output schema`);
                }

                const inputValidation = this.getRepoInputZodSchema().safeParse(input);
                if (inputValidation.success === false) {
                    throw new Error(`Repo Input validation failed in ${this.constructor.name}: ${JSON.stringify(inputValidation.error.issues, null, 2)}`);
                }
            }

            const result = await this._execute(input);

            if (coreConfig.isProduction === false) {
                const outputValidation = this.getRepoOutputZodSchema().safeParse(result);
                if (outputValidation.success === false) {
                    throw new Error(`Repo Output validation failed in ${this.constructor.name}: ${JSON.stringify(outputValidation.error.issues, null, 2)}`);
                }
            }

            return result;
        }
        catch(error: unknown) {
            return this.mapConstraintErrorOrReThrow(error);
        }
        finally {
            const end = performance.now();
            const totalExecutionTimeMillis = end - start;
            const thresholdMillis = this.getDurationThresholdMillis();

            if (totalExecutionTimeMillis > thresholdMillis) {
                this.coreHooks.onSlowRepo({
                    req: this.requestContext.req,
                    repoName: this.constructor.name,
                    executionTimeMillis: totalExecutionTimeMillis,
                    durationThresholdMillis: thresholdMillis,
                });
            }
        }
    }


    private mapConstraintErrorOrReThrow(error: unknown): TOutput {
        type TOutputError = Extract<TOutput, { success: false }>;
        const errorType = checkDatabaseError(error);

        if (errorType.type === 'unique') {
            const uniquesMap = this.getUniqueKeyViolationErrorMap();
            if (errorType.constraint in uniquesMap) {
                return {
                    success: false,
                    errorCode: uniquesMap[errorType.constraint],
                } satisfies Extract<RepoOutput, {success: false}> as TOutputError;
            }
        }

        if (errorType.type === 'foreign') {
            const foreignsMap = this.getForeignKeyViolationErrorMap();
            if (errorType.constraint in foreignsMap) {
                return {
                    success: false,
                    errorCode: foreignsMap[errorType.constraint],
                }  satisfies Extract<RepoOutput, {success: false}> as TOutputError;
            }

            const defaultForeignError = this.getDefaultForeignKeyViolationError();
            if (defaultForeignError !== null) {
                return {
                    success: false,
                    errorCode: defaultForeignError,
                } satisfies Extract<RepoOutput, {success: false}> as TOutputError;
            }
        }

        throw error;
    }

    protected getUniqueKeyViolationErrorMap(): UniqueKeyViolationErrorMap<Extract<TOutput, { success: false }>['errorCode']> {
        return {};
    }

    protected getForeignKeyViolationErrorMap(): ForeignKeyViolationErrorMap<TOutput extends { success: false; errorCode: infer E } ? E : never> {
        return {};
    }

    protected getDefaultForeignKeyViolationError(): (TOutput extends { success: false; errorCode: infer E } ? E : never) | null {
        return null;
    }

    // Use z.ZodType<TInput> for strict mode (no mutations)
    protected abstract getRepoInputZodSchema(): z.ZodType<TInput, z.ZodTypeDef, unknown>;

    protected abstract getRepoOutputZodSchema(): z.ZodDiscriminatedUnion<
        'success',
        readonly
        [
            z.ZodObject<{
                success: z.ZodLiteral<true>;
            } & (Extract<TOutput, { success: true }> extends { data: infer D }
                ? [D] extends [Record<string, unknown>]
                    // Use z.ZodType<D> for strict mode (no mutations)
                    ? { data: z.ZodType<D, z.ZodTypeDef, unknown> }
                    : { data: never }
                : {}),
            'strict'
            >,
            z.ZodObject<{
                success: z.ZodLiteral<false>;
                errorCode: Extract<TOutput, { success: false }>['errorCode'] extends never ? z.ZodNever : z.ZodEnum<[Extract<TOutput, { success: false }>['errorCode'], ...Extract<TOutput, { success: false }>['errorCode']]>;
            },
            'strict'
            >,
        ]
    > & { _output: TOutput };
}
