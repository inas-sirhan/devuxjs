import { UseCaseBase } from '@/core/base-classes/use-case/use-case.base';
import { fullInjectable } from '@/core/utils/core.utils';

@fullInjectable()
export abstract class NonTransactionalUseCase<TRequest> extends UseCaseBase<TRequest> {


    protected async executeInternal(input: TRequest): Promise<void> {
        await this._execute(input);
    }

}
