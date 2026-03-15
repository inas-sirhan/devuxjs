import { AppContainer } from '@/core/containers/app-container';
import type { RequestContainer } from '@/core/containers/request-container';
import type { RepoInput, RepoOutput } from '@/core/base-classes/repo/repo.types';
import type { IRepo } from '@/core/base-classes/repo/repo.interface';
import type { EndpointBindingsConfig } from '@/core/types/core.types';
import { TesterBase } from '@/core/testers/tester.base';


export interface RepoTesterConfig {
    setupRepoBindings: (requestContainer: RequestContainer) => void;
    repoToken: symbol;
    validDeps: ReadonlySet<string>;
}


export abstract class RepoTesterBase<
    TDeps extends Record<string, unknown>,
    TInput extends RepoInput,
    TOutput extends RepoOutput,
> extends TesterBase<TDeps> {

    public constructor(
        protected readonly config: RepoTesterConfig,
    ) {
        super(config.validDeps);
    }

    public async execute(input: TInput): Promise<TOutput> {
        const appContainer = new AppContainer();

        const endpointBindings: EndpointBindingsConfig = {
            setupEndpointBindings: (requestContainer) => {
                this.config.setupRepoBindings(requestContainer);
            },
            controllerSymbol: undefined as any,
            presenterSymbol: undefined as any,
        };

        const requestContainer = appContainer.createRequestContainer(endpointBindings);
        const container = requestContainer.getContainer();
        this.lastContainer = container;

        this.applyReplacements(container);

        const repo = container.get<IRepo<TInput, TOutput>>(this.config.repoToken);
        return await repo.execute(input);
    }
}
