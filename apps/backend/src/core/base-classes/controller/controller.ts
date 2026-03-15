import type { IController } from '@/core/base-classes/controller/controller.interface';
import type { IUseCase } from '@/core/base-classes/use-case/use-case.interface';
import type { IValidator } from '@/core/base-classes/validator/validator.interface';
import { unmanaged } from 'inversify';



type RequestOf<U> = U extends IUseCase<infer TRequest> ? TRequest : never;

type ValidatorOf<U> = IValidator<RequestOf<U>>;

export abstract class Controller<
    TUseCase extends IUseCase<any>,
> implements IController {
    public constructor(
    @unmanaged() protected useCase: TUseCase, 
    @unmanaged() protected validator: ValidatorOf<TUseCase>
    ) {
        
    }

    public async assertCanAccess(): Promise<void> { 
        await this.useCase.assertCanAccess();
    }

    public async handle(input: unknown): Promise<void> {

        await this.useCase.assertCanAccess(); 

        const validatedInput = this.validator.validate(input);

        await this.useCase.execute(validatedInput);

    }
}