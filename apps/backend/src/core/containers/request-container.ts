import type { IController } from '@/core/base-classes/controller/controller.interface';
import type { Presenter } from '@/core/base-classes/presenter/presenter';
import type { EndpointBindingsConfig, Responses } from '@/core/types/core.types';
import type { Request, Response } from 'express';
import { Container, type Newable } from 'inversify';
import { setupRequestContextBindings } from '@/core/core-injectables/request-context/request-context.inversify.bindings';
import { setupDatabaseTransactionManagerBindings } from '@/core/core-injectables/database/database-transaction-manager/database-transaction-manager.inversify.bindings';
import { setupDatabaseTransactionConnectionProviderBindings } from '@/core/core-injectables/database/database-transaction-connection-provider/database-transaction-connection-provider.inversify.bindings';
import { setupAccessGuardBindings } from '@/__internals__/app-services/access-guard/access-guard.inversify.bindings';
import { setupUserContextBindings } from '@/__internals__/app-services/user-context/user-context.inversify.bindings';

export class RequestContainer {
    
    protected readonly requestContainer;
    protected readonly controllerSymbol: symbol;
    protected readonly presenterSymbol: symbol;
    private readonly bindings = new Map<symbol, any>; 

    public constructor(parent: Container, endpointBindings: EndpointBindingsConfig) {
        this.requestContainer = new Container({
            parent,
            defaultScope: 'Singleton',
        });
        this.bindSharedRequestScopedServices();

        endpointBindings.setupEndpointBindings(this);

        this.controllerSymbol = endpointBindings.controllerSymbol;
        this.presenterSymbol = endpointBindings.presenterSymbol;
    }

    protected bindSharedRequestScopedServices(): void {
        setupDatabaseTransactionManagerBindings(this);
        setupDatabaseTransactionConnectionProviderBindings(this);
        setupAccessGuardBindings(this);
        setupUserContextBindings(this);
    }

    public attachRequestContext(req: Request, res: Response): void {
        setupRequestContextBindings(this, {
            req,
            res,
        });
    }

    public bindRequestSingleton<T>(token: symbol, newable: Newable<T>): void {
        if (this.requestContainer.isBound(token)) {
            const existingBinding = this.bindings.get(token);
            if (existingBinding === newable) {
                return;
            }
            throw new Error(`DI Error: Attempted to bind a different implementation to the token '${String(token)}'. Original: ${(existingBinding as any)?.name}, New: ${newable.name}. This indicates a configuration error.`);
        }
        this.requestContainer.bind<T>(token).to(newable).inSingletonScope(); 
        this.bindings.set(token, newable);
    }

    public bindRequestConstantValue<T>(token: symbol, value: T): void {
        if (this.requestContainer.isBound(token)) {
            const existingBinding = this.bindings.get(token);
            if (existingBinding === value) {
                return;
            }
            throw new Error(`DI Error: Attempted to bind a different constant value to the token '${String(token)}'. This indicates a configuration error.`);
        }
        this.requestContainer.bind<T>(token).toConstantValue(value);
        this.bindings.set(token, value);
    }

    public getController<T = IController>(): T {
        return this.requestContainer.get<T>(this.controllerSymbol);
    }
    
    public getPresenter<T = Presenter<Responses>>(): T {
        return this.requestContainer.get<T>(this.presenterSymbol);
    }

    public getContainer(): Container {
        return this.requestContainer;
    }

}

