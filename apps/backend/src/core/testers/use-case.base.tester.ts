import type { Newable } from 'inversify';
import type * as z from 'zod';
import { AppContainer } from '@/core/containers/app-container';
import type { EndpointBindingsConfig, Responses, ResponseShape } from '@/core/types/core.types';
import { Presenter } from '@/core/base-classes/presenter/presenter';
import { ApiError } from '@packages/shared-core/utils/define-api-error';
import { ApiErrors } from '@packages/shared-app/api-errors/api-errors';
import { TesterBase } from '@/core/testers/tester.base';


export interface UseCaseTesterConfig<TResponses extends Responses> {
    endpointBindings: EndpointBindingsConfig;
    responses: TResponses;
    validDeps: ReadonlySet<string>;
}


export abstract class UseCaseTesterBase<
    TDeps extends Record<string, unknown>,
    TRequest,
    TResponses extends Responses,
> extends TesterBase<TDeps> {

    public constructor(
        protected readonly config: UseCaseTesterConfig<TResponses>,
    ) {
        super(config.validDeps);
    }

    public async execute<K extends keyof TResponses>(
        input: TRequest,
        expectedResponseKey: K
    ): Promise<z.infer<TResponses[K]['schema']>['body']>;

    public async execute<K extends keyof typeof ApiErrors>(
        input: TRequest,
        errorClass: typeof ApiError,
        expectedApiErrorKey: K
    ): Promise<z.infer<(typeof ApiErrors)[K]['schema']>>;

    public async execute<E extends Error>(
        input: TRequest,
        errorClass: Newable<E>
    ): Promise<E>;

    public async execute(
        input: TRequest,
        responseKeyOrErrorClass: keyof TResponses | Newable<Error>,
        apiErrorKey?: keyof typeof ApiErrors
    ): Promise<ResponseShape['body'] | Error> {
        const appContainer = new AppContainer();
        const requestContainer = appContainer.createRequestContainer(this.config.endpointBindings);
        const container = requestContainer.getContainer();
        this.lastContainer = container;

        this.applyReplacements(container);

        if (typeof responseKeyOrErrorClass === 'string') {
            const expectedResponseKey = responseKeyOrErrorClass;

            const controller = requestContainer.getController();
            await controller.handle(input);
            const presenter = requestContainer.getPresenter();

            if (!(presenter instanceof Presenter)) {
                throw new Error('Presenter is not an instance of Presenter');
            }

            const responseKey = presenter.getResponseKeyOrThrow();
            const response = presenter.getResponseOrThrow();

            if (responseKey !== expectedResponseKey) {
                throw new Error(`Expected response '${String(expectedResponseKey)}' but got '${responseKey}'`);
            }

            const schema = this.config.responses[expectedResponseKey].schema;
            const expectedStatusCode = schema.shape.statusCode.value;

            if (response.statusCode !== expectedStatusCode) {
                throw new Error(`Expected status ${expectedStatusCode}, got ${response.statusCode}`);
            }

            const parsed = schema.parse(response);
            return parsed.body;
        }

        const errorClass = responseKeyOrErrorClass as Newable<Error>;

        try {
            const controller = requestContainer.getController();
            await controller.handle(input);
            const presenter = requestContainer.getPresenter();

            if (presenter instanceof Presenter) {
                const responseKey = presenter.getResponseKeyOrThrow();
                throw new Error(`Expected ${errorClass.name} but got response '${responseKey}'`);
            }

            throw new Error(`Expected ${errorClass.name} but no error was thrown`);

        }
        catch (error) {
            if (!(error instanceof errorClass)) {
                throw error;
            }

            if (error instanceof ApiError && apiErrorKey !== undefined) {
                const expectedApiError = ApiErrors[apiErrorKey];

                if (error.statusCode !== expectedApiError.statusCode) {
                    throw new Error(`Expected status ${expectedApiError.statusCode}, got ${error.statusCode}`);
                }

                return expectedApiError.schema.parse(error.body);
            }

            return error;
        }
    }
}
