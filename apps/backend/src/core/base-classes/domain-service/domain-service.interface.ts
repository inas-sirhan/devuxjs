import type { DomainServiceInput, DomainServiceOutput } from './domain-service.types';

export interface IDomainService<TInput extends DomainServiceInput, TOutput extends DomainServiceOutput> {
    execute(input: TInput): Promise<TOutput>;
}
