import { injectable } from 'inversify';
import type { IUseCase } from '@/core/base-classes/use-case/use-case.interface';
import { coreConfig } from '@/infrastructure/core/core.config';
import type { RequestContext } from '@/core/core-injectables/request-context/request-context.type';
import { injectRequestContext } from '@/core/core-injectables/request-context/request-context.inversify.tokens';
import { injectCoreHooks } from '@/core/core-injectables/core-hooks/core-hooks.inversify.tokens';
import type { ICoreHooks } from '@/core/core-injectables/core-hooks/core-hooks.interface';
import { type IAccessGuard } from '@/app-services/access-guard/access-guard.interface';
import { injectAccessGuard } from '@/__internals__/app-services/access-guard/access-guard.inversify.tokens';
import { type IUserContext } from '@/app-services/user-context/user-context.interface';
import { injectUserContext } from '@/__internals__/app-services/user-context/user-context.inversify.tokens';

@injectable()
export abstract class UseCaseBase<TRequest> implements IUseCase<TRequest> {

    @injectCoreHooks() private readonly coreHooks!: ICoreHooks;
    @injectRequestContext() private readonly requestContext!: RequestContext;
    @injectAccessGuard() protected readonly accessGuard!: IAccessGuard;
    @injectUserContext() protected readonly userContext!: IUserContext;
    private accessAlreadyAsserted: boolean = false;

    public async execute(input: TRequest): Promise<void> {
        const startTime = performance.now();

        try {
            await this.assertCanAccess();

            await this.executeInternal(input);
        }
        finally {
            const duration = performance.now() - startTime;
            const thresholdMillis = this.getDurationThresholdMillis();
            if (duration > thresholdMillis) {
                this.coreHooks.onSlowUseCase({
                    req: this.requestContext.req,
                    useCaseName: this.constructor.name,
                    executionTimeMillis: duration,
                    durationThresholdMillis: thresholdMillis,
                });
            }
        }
    }


    protected abstract executeInternal(input: TRequest): Promise<void>;


    protected abstract _execute(input: TRequest): Promise<void>;

    public async assertCanAccess(): Promise<void> {
        if (this.accessAlreadyAsserted === true) {
            return;
        }
        this.accessAlreadyAsserted = true;
        await this._assertCanAccess();
    }

    protected abstract _assertCanAccess(): Promise<void>;

    protected getDurationThresholdMillis(): number {
        return coreConfig.useCaseDurationThresholdMillis;
    }

}
