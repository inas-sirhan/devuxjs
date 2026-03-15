import { fullInjectable } from '@/core/utils/core.utils';
import type { DomainServiceInput, DomainServiceOutput } from '@/core/base-classes/domain-service/domain-service.types';
import { DomainServiceBase } from '@/core/base-classes/domain-service/domain-service.base';

@fullInjectable()
export abstract class DomainService<TInput extends DomainServiceInput, TOutput extends DomainServiceOutput> extends DomainServiceBase<TInput, TOutput> {

}
