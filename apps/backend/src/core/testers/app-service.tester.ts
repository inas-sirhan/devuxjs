import type { Container } from 'inversify';
import { AppContainer } from '@/core/containers/app-container';
import type { RequestContainer } from '@/core/containers/request-container';
import type { EndpointBindingsConfig } from '@/core/types/core.types';
import { TesterBase } from '@/core/testers/tester.base';


export interface AppServiceTesterConfig {
    setupServiceBindings: ((appContainer: AppContainer) => void) | ((requestContainer: RequestContainer) => void);
    serviceToken: symbol;
    isGlobal: boolean;
    validDeps: ReadonlySet<string>;
}


export abstract class AppServiceTester<
    TService,
    TDeps extends Record<string, unknown>,
> extends TesterBase<TDeps> {

    public constructor(
        protected readonly config: AppServiceTesterConfig,
    ) {
        super(config.validDeps);
    }

    public createService(): TService {
        this.lastContainer = this.createContainer();
        return this.lastContainer.get<TService>(this.config.serviceToken);
    }

    private createContainer(): Container {
        const appContainer = new AppContainer();

        if (this.config.isGlobal) {
            (this.config.setupServiceBindings as (ac: AppContainer) => void)(appContainer);

            const container = appContainer.getContainer();

            this.applyReplacements(container);

            return container;
        }
        else {
            const endpointBindings: EndpointBindingsConfig = {
                setupEndpointBindings: (requestContainer) => {
                    (this.config.setupServiceBindings as (rc: RequestContainer) => void)(requestContainer);
                },
                controllerSymbol: undefined as any,
                presenterSymbol: undefined as any,
            };

            const requestContainer = appContainer.createRequestContainer(endpointBindings);
            const container = requestContainer.getContainer();

            this.applyReplacements(container);

            return container;
        }
    }
}
