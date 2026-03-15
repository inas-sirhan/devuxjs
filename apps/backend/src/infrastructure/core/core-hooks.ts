import type { ICoreHooks, SerializationErrorContext, DeadlockErrorContext, TransactionStartErrorContext, SafeRollbackErrorContext, SlowUseCaseContext, SlowRepoContext, SlowDomainServiceContext, ValidationErrorContext } from '@/core/core-injectables/core-hooks/core-hooks.interface';
import { injectable } from 'inversify';


@injectable()
export class CoreHooks implements ICoreHooks {

    public onSerializationError(_context: SerializationErrorContext): void {

    }

    public onDeadlockError(_context: DeadlockErrorContext): void {

    }

    public onTransactionStartError(_context: TransactionStartErrorContext): void {

    }

    public onSafeRollbackError(_context: SafeRollbackErrorContext): void {

    }

    public onSlowUseCase(_context: SlowUseCaseContext): void {

    }

    public onSlowRepo(_context: SlowRepoContext): void {

    }

    public onSlowDomainService(_context: SlowDomainServiceContext): void {

    }

    public onValidationError(_context: ValidationErrorContext): void {

    }

}