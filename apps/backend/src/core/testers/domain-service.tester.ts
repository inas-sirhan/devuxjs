import type { DomainServiceInput, DomainServiceOutput } from '@/core/base-classes/domain-service/domain-service.types';
import type { IDomainService } from '@/core/base-classes/domain-service/domain-service.interface';
import { AppContainer } from '@/core/containers/app-container';
import type { RequestContainer } from '@/core/containers/request-container';
import type { EndpointBindingsConfig } from '@/core/types/core.types';
import { TransactionalTesterBase } from '@/core/testers/transactional.base.tester';


export interface DomainServiceTesterConfig {
    setupServiceBindings: (requestContainer: RequestContainer) => void;
    serviceToken: symbol;
    validDeps: ReadonlySet<string>;
}


export abstract class DomainServiceTester<
    TDeps extends Record<string, unknown>,
    TInput extends DomainServiceInput,
    TOutput extends DomainServiceOutput,
> extends TransactionalTesterBase<TDeps> {

    public constructor(
        protected readonly config: DomainServiceTesterConfig,
    ) {
        super(config.validDeps);
    }

    public async execute(input: TInput): Promise<TOutput> {
        const appContainer = new AppContainer();

        const endpointBindings: EndpointBindingsConfig = {
            setupEndpointBindings: (requestContainer) => {
                this.config.setupServiceBindings(requestContainer);
            },
            controllerSymbol: undefined as any,
            presenterSymbol: undefined as any,
        };

        const requestContainer = appContainer.createRequestContainer(endpointBindings);
        const container = requestContainer.getContainer();
        this.lastContainer = container;

        this.applyReplacements(container);

        const service = container.get<IDomainService<TInput, TOutput>>(this.config.serviceToken);

        return await this.executeInTransaction(container, () => service.execute(input));
    }
}
