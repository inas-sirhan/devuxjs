import type { IDomainService } from './domain-service.interface';
import type { DomainServiceInput, DomainServiceOutput } from './domain-service.types';
import { coreConfig } from '@/infrastructure/core/core.config';
import { injectable } from 'inversify';
import type * as z from 'zod';
import type { RequestContext } from '@/core/core-injectables/request-context/request-context.type';
import { injectRequestContext } from '@/core/core-injectables/request-context/request-context.inversify.tokens';
import type { ICoreHooks } from '@/core/core-injectables/core-hooks/core-hooks.interface';
import { injectCoreHooks } from '@/core/core-injectables/core-hooks/core-hooks.inversify.tokens';
import { CoreZodUtils } from '@/core/utils/zod.core.utils';
import { type IUserContext } from '@/app-services/user-context/user-context.interface';
import { injectUserContext } from '@/__internals__/app-services/user-context/user-context.inversify.tokens';

@injectable()
export abstract class DomainServiceBase<TInput extends DomainServiceInput, TOutput extends DomainServiceOutput>
    implements IDomainService<TInput, TOutput>
{

    @injectCoreHooks() private readonly coreHooks!: ICoreHooks;
    @injectRequestContext() private readonly requestContext!: RequestContext;
    @injectUserContext() protected readonly userContext!: IUserContext;

    protected getDurationThresholdMillis(): number {
        return coreConfig.domainServiceDurationThresholdMillis;
    }
    

    public async execute(input: TInput): Promise<TOutput> {
        const startTime = performance.now();

        try {
            if (coreConfig.isProduction === false) {
                if (coreConfig.assertNoMutationsInInternalSchemas === true) {
                    CoreZodUtils.assertNoMutationsOnce(this.getServiceInputZodSchema(), `${this.constructor.name}'s input schema`);
                    CoreZodUtils.assertNoMutationsOnce(this.getServiceOutputZodSchema(), `${this.constructor.name}'s output schema`);
                }

                const inputValidation = this.getServiceInputZodSchema().safeParse(input);
                if (inputValidation.success === false) {
                    throw new Error(`Service Input validation failed in ${this.constructor.name}: ${JSON.stringify(inputValidation.error.issues, null, 2)}`);
                }
            }

            const result = await this._execute(input);

            if (coreConfig.isProduction === false) {
                const outputValidation = this.getServiceOutputZodSchema().safeParse(result);
                if (outputValidation.success === false) {
                    throw new Error(
                        `Service Output validation failed in ${this.constructor.name}: ${JSON.stringify(outputValidation.error.issues, null, 2)}`
                    );
                }
            }

            return result;
        } finally {
            const endTime = performance.now();
            const executionTime = endTime - startTime;
            const thresholdMillis = this.getDurationThresholdMillis();

            if (executionTime > thresholdMillis) {
                this.coreHooks.onSlowDomainService({
                    req: this.requestContext.req,
                    domainServiceName: this.constructor.name,
                    executionTimeMillis: executionTime,
                    durationThresholdMillis: thresholdMillis,
                });
            }
        }
    }


    protected abstract _execute(input: TInput): Promise<TOutput>;

    // Use z.ZodType<TInput> for strict mode (no mutations)
    protected abstract getServiceInputZodSchema(): z.ZodType<TInput, z.ZodTypeDef, unknown>;

    protected abstract getServiceOutputZodSchema(): z.ZodDiscriminatedUnion<
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
