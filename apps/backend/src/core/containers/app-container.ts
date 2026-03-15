import { Container, type Newable } from 'inversify';
import express from 'express';
import { disableResponsesCaching } from '@/core/middlewares/disable-responses-caching.middleware';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { RequestContainer } from '@/core/containers/request-container';

import { EndpointsValidator, type RouteSegment } from '@/core/utils/endpoints-validator.core.utils';
import { OpenApiEndpointsRegistrar } from '@/core/utils/openapi-endpoints-registrar.core.utils';
import type { EndpointBindingsConfig } from '@/core/types/core.types';
import { setupDatabaseConnectionPoolBindings } from '@/core/core-injectables/database/database-connection-pool/database-connection-pool.inversify.bindings';
import { setupCoreHooksBindings } from '@/core/core-injectables/core-hooks/core-hooks.inversify.bindings';


type PendingRoute = { register: () => void; segments: RouteSegment[] };


export class AppContainer {

    protected readonly container: Container;

    protected readonly app: express.Express;

    protected readonly endpointsValidator: EndpointsValidator;

    protected openApiEndpointsRegistrar: OpenApiEndpointsRegistrar | 'cleared' | 'uninitialized';

    protected readonly jsonBodyParsersCache: Map<string, express.RequestHandler>;

    protected readonly queryParamsParsersCache: Map<string, express.RequestHandler>;

    private readonly pendingRoutes: PendingRoute[];

    public constructor() {

        this.container = new Container({
            defaultScope: 'Singleton',
        });

        this.bindGlobalSingletonServices();
        this.endpointsValidator = new EndpointsValidator();
        this.openApiEndpointsRegistrar = 'uninitialized'; 
        this.jsonBodyParsersCache = new Map();
        this.queryParamsParsersCache = new Map();
        this.pendingRoutes = [];

        this.app = express();
        this.app.set('query parser', false);
        this.app.set('etag', false);
        this.app.use(disableResponsesCaching);
    }

    public getExpressApp(): express.Express {
        return this.app;
    }

    public getContainer(): Container {
        return this.container;
    }

    public getJsonBodyParsersCache(): Map<string, express.RequestHandler> {
        return this.jsonBodyParsersCache;
    }

    public getQueryParamsParsersCache(): Map<string, express.RequestHandler> {
        return this.queryParamsParsersCache;
    }

    public createRequestContainer(endpointBindings: EndpointBindingsConfig): RequestContainer {
        return new RequestContainer(this.container, endpointBindings);
    }

    public getEndpointsValidator(): EndpointsValidator {
        return this.endpointsValidator;
    }

    public addPendingRoute(route: PendingRoute): void {
        this.pendingRoutes.push(route);
    }

    public registerRoutes(): void {
        this.pendingRoutes
            .sort((a, b) => {

                if (a.segments.length !== b.segments.length) {
                    return b.segments.length - a.segments.length;
                }

                
                const aStaticCount = a.segments.filter(s => s.type === 'static').length;
                const bStaticCount = b.segments.filter(s => s.type === 'static').length;

                if (aStaticCount !== bStaticCount) {
                    return bStaticCount - aStaticCount;
                }

                for (let i = 0; i < a.segments.length; i++) {
                    const aSeg = a.segments[i];
                    const bSeg = b.segments[i];

                    if (aSeg.type === 'static' && bSeg.type === 'param') {
                        return -1;
                    }
                    if (aSeg.type === 'param' && bSeg.type === 'static') {
                        return 1;
                    }

                    if (aSeg.type === 'static' && bSeg.type === 'static') {
                        if (aSeg.value !== bSeg.value) {
                            return aSeg.value.localeCompare(bSeg.value);
                        }
                    }

                    if (aSeg.type === 'param' && bSeg.type === 'param') {
                        if (aSeg.name !== bSeg.name) {
                            return aSeg.name.localeCompare(bSeg.name);
                        }
                    }
                }

                return 0;
            })
            .forEach(route => route.register());

        this.pendingRoutes.length = 0;
    }

    public getOpenApiEndpointsRegistrar(): OpenApiEndpointsRegistrar {
        if (this.openApiEndpointsRegistrar === 'cleared') {
            throw new Error('OpenApiEndpointsRegistrar is cleared. Cannot access it anymore.');
        }
        if (this.openApiEndpointsRegistrar === 'uninitialized') { 
            this.openApiEndpointsRegistrar = new OpenApiEndpointsRegistrar();
        }
        return this.openApiEndpointsRegistrar;
    }

    public getOpenApiRegistry(): OpenAPIRegistry | undefined {
        if (this.openApiEndpointsRegistrar === 'cleared') {
            throw new Error('OpenApiEndpointsRegistrar is cleared. Make sure to call it before clear..');
        }
        if (this.openApiEndpointsRegistrar === 'uninitialized') {
            return undefined; 
        }
        return this.openApiEndpointsRegistrar.getRegistry();
    }

    public bindGlobalSingleton<T>(token: symbol, newable: Newable<T>): void {
        if (this.container.isBound(token) === true) { 
            throw new Error("Detected double binding...");
        }
        this.container.bind<T>(token).to(newable).inSingletonScope();
    }

     public bindGlobalConstantValue<T>(token: symbol, value: T): void {
        if (this.container.isBound(token) === true) { 
            throw new Error("Detected double binding...");
        }
        this.container.bind<T>(token).toConstantValue(value);
    }

    protected bindGlobalSingletonServices(): void {
        setupDatabaseConnectionPoolBindings(this);
        setupCoreHooksBindings(this);
    }
   
    public clearSetupRelatedCaches(): void {
        this.openApiEndpointsRegistrar = 'cleared';
        this.endpointsValidator.clearAll();
        this.jsonBodyParsersCache.clear();
        this.queryParamsParsersCache.clear();
    }

}