import type { AppContainer } from '@/core/containers/app-container';
import { accessControlHandler } from '@/core/middlewares/access-control-handler.middleware';
import { initRequest } from '@/core/middlewares/init-request.middleware';
import { createJsonBodyParser } from '@/core/middlewares/json-body-parser.middleware';
import { createMulterUpload, moveFileToBody, moveFilesToBody, multerErrorsHandler } from '@/core/middlewares/multer.middlewares';
import { createQueryParamsParser } from '@/core/middlewares/query-params-parser.middleware';
import { resetBody } from '@/core/middlewares/reset-body.middleware';
import { resetQueryParams } from '@/core/middlewares/reset-query-params.middleware';
import { responseHandler } from '@/core/middlewares/response-handler.middleware';
import { routeHandler } from '@/core/middlewares/route-handler.middleware';
import type { EndpointBindingsConfig, HttpMethod, RequestSchema, Responses, SafeOmit } from '@/core/types/core.types';
import type { RoutePath } from '@/core/utils/route-path.core.utils';
import { CoreZodUtils } from '@/core/utils/zod.core.utils';
import { coreConfig } from '@/infrastructure/core/core.config';
import type { ErrorRequestHandler, RequestHandler } from 'express';


export type RouteConfig<M extends HttpMethod, IsFileUpload extends boolean = false> = SafeOmit<SetupEndpointConfig<M, RequestSchema, IsFileUpload>,
    | 'bindings'
    | 'container'
    | 'endpointId'
    | 'openApiConfig'
> & Pick<SetupEndpointConfig<M, RequestSchema, IsFileUpload>['openApiConfig'], 'summary' | 'description' | 'extraTags'>;


export type JsonBodyParserOptions = {
    maxBodySizeBytes?: number;
}

export type QueryParamsParserOptions = {
    parameterLimit?: number;
    depthLimit?: number;
    arrayLimit?: number;
}

export type DestinationFn = (req: Express.Request, file: Express.Multer.File) => string | Promise<string>;
export type FilenameFn = (req: Express.Request, file: Express.Multer.File) => string | Promise<string>;

type FileUploadStorageConfig = {
    storageType: 'memory';
} | {
    storageType: 'disk';
    destination: string | DestinationFn;
    generateFilename: FilenameFn;
};

type FileUploadBaseOptions = {
    maxFileSizeBytes: number;
    allowedMimeTypes: string[]; 
    maxFieldValueSizeBytes?: number;
    maxFieldNameSizeBytes?: number;
};

export type SingleFileUploadOptions = FileUploadBaseOptions & FileUploadStorageConfig & {
    mode: 'single';
};

export type ArrayFileUploadOptions = FileUploadBaseOptions & FileUploadStorageConfig & {
    mode: 'array';
    maxCount: number;
};

export type FieldsMemoryFieldConfig = {
    name: string;
    maxCount: number;
    allowedMimeTypes: string[];
};

export type FieldsDiskFieldConfig = {
    name: string;
    maxCount: number;
    allowedMimeTypes: string[];
    destination: string | DestinationFn;
    generateFilename: FilenameFn;
};

type FieldsFileUploadBaseOptions = {
    mode: 'fields';
    maxFileSizeBytes: number;
    maxFieldValueSizeBytes?: number;
    maxFieldNameSizeBytes?: number;
};

export type FieldsFileUploadOptions = FieldsFileUploadBaseOptions & (
    | { storageType: 'memory'; fields: FieldsMemoryFieldConfig[] }
    | { storageType: 'disk'; fields: FieldsDiskFieldConfig[] }
);

export type FileUploadOptions = SingleFileUploadOptions | ArrayFileUploadOptions | FieldsFileUploadOptions;


export type SetupEndpointConfig<
    M extends HttpMethod,
    S extends RequestSchema,
    IsFileUpload extends boolean
> = {
    container: AppContainer;
    endpointId: string;
    path: RoutePath<any>;
    method: IsFileUpload extends true ? Exclude<M, 'get' | 'delete'> : M;
    bindings: EndpointBindingsConfig;
    isFileUpload?: IsFileUpload;
    middlewares?: {
        beforeAny?: (RequestHandler | ErrorRequestHandler)[];
        beforeRouteHandler?: (RequestHandler | ErrorRequestHandler)[];
        afterRouteHandler?: (RequestHandler | ErrorRequestHandler)[];
    };

    openApiConfig: {
        summary?: string;
        description?: string;
        extraTags?: string[];
        requestSchema: S;
        responses: Responses;
    }
}
& (IsFileUpload extends true
    ? { fileUploadConfig: FileUploadOptions }
    : M extends 'get' | 'delete'
        ? { queryParamsParser?: QueryParamsParserOptions }
        : { jsonBodyParser?: JsonBodyParserOptions }
);



export function setupEndpoint<
    M extends HttpMethod,
    S extends RequestSchema,
    IsFileUpload extends boolean = false
>(config: SetupEndpointConfig<M, S, IsFileUpload>): void {

    const { path, method, endpointId } = config;

    const endpointsValidator = config.container.getEndpointsValidator();
    endpointsValidator.assertValidEndpoint(config);

    const { middlewares: middlewaresConfig } = config;

    const app = config.container.getExpressApp();

    const middlewares: (RequestHandler | ErrorRequestHandler)[] = [];

    if (middlewaresConfig?.beforeAny !== undefined) {
        middlewares.push(...middlewaresConfig.beforeAny);
    }

    middlewares.push(initRequest(config.container, config.bindings, endpointId)); 

    middlewares.push(accessControlHandler); 

    if (config.isFileUpload === true) {
        const fileUploadConfig = (config as SetupEndpointConfig<'post', any, true>).fileUploadConfig;
        const maxFields = CoreZodUtils.getKeyCount(config.openApiConfig.requestSchema) - 1;

        middlewares.push(createMulterUpload({ fileUploadConfig, maxFields }));
        middlewares.push(multerErrorsHandler);
        middlewares.push(fileUploadConfig.mode === 'single' ? moveFileToBody : moveFilesToBody);
        middlewares.push(resetQueryParams);
    }
    else {
        if (method === 'get' || method === 'delete') {
            const queryConfig = config as SetupEndpointConfig<'get' | 'delete', any, false>;
            middlewares.push(createQueryParamsParser(config.container, queryConfig.queryParamsParser));
            middlewares.push(resetBody);
        }
        else {
            const bodyConfig = config as SetupEndpointConfig<'post', any, false>;
            middlewares.push(createJsonBodyParser(config.container, bodyConfig.jsonBodyParser));
            middlewares.push(resetQueryParams);
        }
    }

    if (middlewaresConfig?.beforeRouteHandler !== undefined) {
        middlewares.push(...middlewaresConfig.beforeRouteHandler);
    }

    middlewares.push(routeHandler);

    if (middlewaresConfig?.afterRouteHandler !== undefined) {
        middlewares.push(...middlewaresConfig.afterRouteHandler);
    }

    config.container.addPendingRoute({
        segments: endpointsValidator.parseSegments(path),
        register: () => app[method](path.getExpressPath(), ...middlewares, responseHandler),
    });

    if (coreConfig.syncApi === true) {
        const openApiRegistrar = config.container.getOpenApiEndpointsRegistrar();
        openApiRegistrar.registerRoute({
            path,
            method,
            operationId: endpointId,
            ...(config.openApiConfig.summary !== undefined && { summary: config.openApiConfig.summary }),
            ...(config.openApiConfig.description !== undefined && { description: config.openApiConfig.description }),
            ...(config.openApiConfig.extraTags !== undefined && { extraTags: config.openApiConfig.extraTags }),
            requestSchema: config.openApiConfig.requestSchema,
            responses: config.openApiConfig.responses,
            fileUploadConfig: config.isFileUpload === true
                ? (config as SetupEndpointConfig<'post', any, true>).fileUploadConfig
                : null,
        });
    }

}

