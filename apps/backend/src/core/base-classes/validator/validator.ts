import type { IValidator } from '@/core/base-classes/validator/validator.interface';
import { joinDotted } from '@/core/utils/core.utils';
import { injectable } from 'inversify';
import { ApiErrors } from '@packages/shared-app/api-errors/api-errors';
import type { RequestContext } from '@/core/core-injectables/request-context/request-context.type';
import { injectRequestContext } from '@/core/core-injectables/request-context/request-context.inversify.tokens';
import { injectCoreHooks } from '@/core/core-injectables/core-hooks/core-hooks.inversify.tokens';
import type { ICoreHooks } from '@/core/core-injectables/core-hooks/core-hooks.interface';
import type * as z from 'zod';


@injectable()
export abstract class Validator<T extends Record<string, unknown>> implements IValidator<T> {

    @injectCoreHooks() private readonly coreHooks!: ICoreHooks;
    @injectRequestContext() private readonly requestContext!: RequestContext;

    public validate(input: unknown): T {
        const result = this.getValidationSchema().safeParse(input);
        if (result.success === true) {
            return result.data;
        }
        else {
            this.coreHooks.onValidationError({
                req: this.requestContext.req,
                validatorName: this.constructor.name,
                input,
                zodError: result.error,
            });

            type ValidationErrors = Parameters<(typeof ApiErrors)['ValidationError']['throw']>[0]['validationErrors'];
            const validationErrors: ValidationErrors = [];
            for (const issue of result.error.issues) {
                validationErrors.push({
                    errorCode: issue.message,
                    path: joinDotted(issue.path),
                });
            }
            return ApiErrors['ValidationError'].throw({
                validationErrors,
            });
        }
    }

    protected abstract getValidationSchema(): z.ZodType<T, z.ZodTypeDef, Record<string, unknown>>;

}

