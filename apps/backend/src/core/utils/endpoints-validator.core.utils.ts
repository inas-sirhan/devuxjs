import type { RoutePath } from '@/core/utils/route-path.core.utils';
import type { SetupEndpointConfig } from '@/core/utils/setup-endpoint.core.utils';
import type { HttpMethod, RequestSchema } from '@/core/types/core.types';
import { CoreZodUtils } from '@/core/utils/zod.core.utils';
import { coreConfig } from '@/infrastructure/core/core.config';
import * as z from 'zod';


export type RouteSegment =
    | { type: 'static'; value: string }
    | { type: 'param'; name: string };


export class EndpointsValidator {
    private readonly endpointIds: Set<string>;
    private readonly endpoints: Set<string>;
    private readonly routeStructures: Set<string>;

    public constructor() {
        this.endpointIds = new Set();
        this.endpoints = new Set();
        this.routeStructures = new Set();
    }

    public assertValidEndpoint<
    M extends HttpMethod,
    S extends RequestSchema,
    IsFileUpload extends boolean = false
    >(config: SetupEndpointConfig<M, S, IsFileUpload>): void {
        const { path, method, endpointId, isFileUpload } = config;
        const requestSchema = config.openApiConfig.requestSchema;
        const responses = config.openApiConfig.responses;

        if (/^[a-z][A-Za-z]+$/.test(endpointId) === false) {
            throw new Error(
                `Error in endpointId="${endpointId}". ` +
                `It must contain english letters only (small/capital) and be camelCase. ` +
                `Must start with lowercase letter.`
            );
        }

        const loweredEndpointId = endpointId.toLowerCase();
        if (this.endpointIds.has(loweredEndpointId) === true) {
            throw new Error(
                `This endpointId ('${endpointId}') has already been used. ` +
                `Endpoint IDs must be unique (case-insensitive).`
            );
        }
        this.endpointIds.add(loweredEndpointId);

        if (path.isValidPath() === false) {
            throw new Error(
                `Invalid path: No segments added yet. ` +
                `Cannot use empty path for an endpoint.`
            );
        }

        const endpointKey = this.toEndpointKey(path, method);
        if (this.endpoints.has(endpointKey) === true) {
            throw new Error(
                `[Duplicate Endpoint]: ${method.toUpperCase()} ${path.getExpressPath()} already exists.`
            );
        }
        this.endpoints.add(endpointKey);

        const structureKey = this.toStructureKey(path, method);
        if (this.routeStructures.has(structureKey) === true) {
            throw new Error(
                `[Route Structure Conflict]: ${method.toUpperCase()} ${path.getExpressPath()} - ` +
                `another route with the same structure already exists.`
            );
        }
        this.routeStructures.add(structureKey);

        const pathParamsFromRoutePath = path.getPathParams();
        const validationResult = CoreZodUtils.validateKeysInAllOptions(requestSchema, pathParamsFromRoutePath);
        if (validationResult.valid === false) {
            const missingDetails = Array.from(validationResult.missingKeys.entries())
                .map(([key, options]) => `'${key}' missing in ${options.join(', ')}`)
                .join('; ');
            throw new Error(
                `Path params validation failed for endpointId="${endpointId}": ${missingDetails}. ` +
                `All path params must exist in all options of the request schema.`
            );
        }

        const unwrappedSchema = CoreZodUtils.unwrapZodEffects(requestSchema);

        const unwrapToBaseType = (schema: z.ZodTypeAny): z.ZodTypeAny => {
            const unwrapped = CoreZodUtils.unwrapZodEffects(schema);
            if (unwrapped instanceof z.ZodOptional || unwrapped instanceof z.ZodNullable) {
                return unwrapToBaseType(unwrapped.unwrap());
            }
            return unwrapped;
        };

        const requiresCoercion = (schema: z.ZodTypeAny): boolean => {
            if (schema instanceof z.ZodNumber || schema instanceof z.ZodBoolean) {
                return schema._def.coerce !== true;
            }
            return false;
        };

        if (pathParamsFromRoutePath.length > 0) {
            const firstOption = CoreZodUtils.getUnionOptions(requestSchema)[0];
            for (const paramKey of pathParamsFromRoutePath) {
                const paramSchema = firstOption.shape[paramKey];
                if (requiresCoercion(paramSchema) === true) {
                    const base = unwrapToBaseType(paramSchema);
                    const typeName = base instanceof z.ZodNumber ? 'number' : 'boolean';
                    throw new Error(
                        `Path param '${paramKey}' (endpointId="${endpointId}"): ` +
                        `${typeName} schemas must use coercion for path params. ` +
                        `Use z.coerce.${typeName}() instead of z.${typeName}().`
                    );
                }
            }
        }

        const isUnion = unwrappedSchema instanceof z.ZodDiscriminatedUnion || unwrappedSchema instanceof z.ZodUnion;

        if (method === 'get' || method === 'delete') {
            if (isUnion === true) {
                throw new Error(
                    `${method.toUpperCase()} endpoint (endpointId="${endpointId}"): ` +
                    `Request schema cannot be a union or discriminated union. ` +
                    `Query param schemas must be simple strict objects.`
                );
            }
            const schemaShape = (unwrappedSchema as z.ZodObject<z.ZodRawShape>).shape;
            const pathParamsSet = new Set(pathParamsFromRoutePath);
            for (const [key, fieldSchema] of Object.entries(schemaShape)) {
                if (pathParamsSet.has(key) === true) continue;
                if (requiresCoercion(fieldSchema as z.ZodTypeAny) === true) {
                    const base = unwrapToBaseType(fieldSchema as z.ZodTypeAny);
                    const typeName = base instanceof z.ZodNumber ? 'number' : 'boolean';
                    throw new Error(
                        `Query param '${key}' (endpointId="${endpointId}"): ` +
                        `${typeName} schemas must use coercion for query params. ` +
                        `Use z.coerce.${typeName}() instead of z.${typeName}().`
                    );
                }
            }
        }

        if (isUnion === true) {
            if (isFileUpload === true) {
                throw new Error(
                    `File upload endpoint (endpointId="${endpointId}"): ` +
                    `Request schema cannot be a union or discriminated union. ` +
                    `File upload schemas must be simple strict objects.`
                );
            }

            if (unwrappedSchema instanceof z.ZodUnion) {
                for (let i = 0; i < unwrappedSchema.options.length; i++) {
                    const opt = unwrappedSchema.options[i];
                    const unwrappedOpt = CoreZodUtils.unwrapZodEffects(opt);
                    if (!(unwrappedOpt instanceof z.ZodObject)) {
                        throw new Error(
                            `Invalid union option at index ${i} (endpointId="${endpointId}"): ` +
                            `expected ZodObject but got ${unwrappedOpt.constructor.name}. ` +
                            `Nested unions are not supported.`
                        );
                    }
                }
            }

            const pathParams: Record<string, true> = {};
            for (const param of pathParamsFromRoutePath) {
                pathParams[param] = true;
            }
            const schemaAfterPathParamRemoval = pathParamsFromRoutePath.length > 0
                ? CoreZodUtils.omitFromSchema(requestSchema, pathParams as any)
                : requestSchema;
            const options = CoreZodUtils.getUnionOptions(schemaAfterPathParamRemoval);
            const hasEmptyOption = options.some(opt => Object.keys(opt.shape).length === 0);
            if (hasEmptyOption === true) {
                throw new Error(
                    `Union schema (endpointId="${endpointId}"): ` +
                    `At least one union option is empty or has no fields after path param removal. ` +
                    `Each union option must have at least one field to differentiate request variants.`
                );
            }
        }

        if (unwrappedSchema instanceof z.ZodDiscriminatedUnion) {
            const discriminator = unwrappedSchema.discriminator;
            if (pathParamsFromRoutePath.includes(discriminator) === true) {
                throw new Error(
                    `Discriminator key '${discriminator}' cannot be a path param (endpointId="${endpointId}"). ` +
                    `The discriminator is used to differentiate request body variants, not for URL path segments.`
                );
            }
        }

        if (isFileUpload === true) {
            const fileUploadConfig = (config as SetupEndpointConfig<any, any, true>).fileUploadConfig;
            
            const schemaShape = (unwrappedSchema as z.ZodObject<z.ZodRawShape>).shape;
            const schemaKeys = new Set(Object.keys(schemaShape));

            function validateStorageTypeMatch (fileSchema: z.ZodTypeAny, fieldPath: string) {
                if (fileSchema instanceof z.ZodObject) {
                    const shape = fileSchema.shape;
                    const schemaHasBuffer = 'buffer' in shape;
                    const schemaHasPath = 'path' in shape;
                    const configStorageType = fileUploadConfig.storageType;

                    if (schemaHasBuffer && configStorageType === 'disk') {
                        throw new Error(
                            `File upload endpoint (endpointId="${endpointId}"): storage type mismatch at '${fieldPath}'. ` +
                            `Schema has 'buffer' (memory storage) but config specifies 'disk'. ` +
                            `Either change the schema to use disk storage or update the config storageType to 'memory'.`
                        );
                    }
                    if (schemaHasPath && configStorageType === 'memory') {
                        throw new Error(
                            `File upload endpoint (endpointId="${endpointId}"): storage type mismatch at '${fieldPath}'. ` +
                            `Schema has 'path' (disk storage) but config specifies 'memory'. ` +
                            `Either change the schema to use memory storage or update the config storageType to 'disk'.`
                        );
                    }
                }
            };

            if (fileUploadConfig.mode === 'single') {
                if (schemaKeys.has('file') === false) {
                    throw new Error(
                        `File upload endpoint (endpointId="${endpointId}") with mode 'single' must have a 'file' field in request schema. Use 'withSingleFileUploadZodSchema' utility.`
                    );
                }
                validateStorageTypeMatch(schemaShape.file, 'file');
            }
            else {
                if (fileUploadConfig.mode === 'array') {
                    if (schemaKeys.has('files') === false) {
                        throw new Error(
                            `File upload endpoint (endpointId="${endpointId}") with mode 'array' must have a 'files' field in request schema. Use 'withArrayFileUploadZodSchema' utility.`
                        );
                    }
                    if (fileUploadConfig.maxCount < 1) {
                        throw new Error(
                            `File upload endpoint (endpointId="${endpointId}"): maxCount must be at least 1.`
                        );
                    }
                    const filesSchema = schemaShape.files;
                    if (filesSchema instanceof z.ZodArray) {
                        validateStorageTypeMatch(filesSchema.element, 'files[]');
                    }
                }
                else {
                    if (fileUploadConfig.mode === 'fields') {
                        if (schemaKeys.has('files') === false) {
                            throw new Error(
                                `File upload endpoint (endpointId="${endpointId}") with mode 'fields' must have a 'files' field in request schema. Use 'withFieldsFileUploadZodSchema' utility.`
                            );
                        }

                        for (const field of fileUploadConfig.fields) {
                            if (field.maxCount < 1) {
                                throw new Error(
                                    `File upload endpoint (endpointId="${endpointId}"): field "${field.name}" maxCount must be at least 1.`
                                );
                            }
                        }

                        if (fileUploadConfig.fields.length === 0) {
                            throw new Error(
                                `File upload endpoint (endpointId="${endpointId}"): fields array cannot be empty. At least one field must be defined.`
                            );
                        }

                        const filesSchema = schemaShape.files;
                        if (filesSchema instanceof z.ZodObject) {
                            const schemaFileKeys = new Set(Object.keys(filesSchema.shape));
                            const configFieldNames = new Set(fileUploadConfig.fields.map(f => f.name));

                            for (const fieldName of configFieldNames) {
                                if (schemaFileKeys.has(fieldName) === false) {
                                    throw new Error(
                                        `File upload endpoint (endpointId="${endpointId}"): field config "${fieldName}" does not exist in schema's 'files' object. Available: ${Array.from(schemaFileKeys).join(', ')}`
                                    );
                                }
                            }

                            for (const schemaKey of schemaFileKeys) {
                                if (configFieldNames.has(schemaKey) === false) {
                                    throw new Error(
                                        `File upload endpoint (endpointId="${endpointId}"): schema's 'files.${schemaKey}' is missing a field config.`
                                    );
                                }
                            }

                            const firstFieldSchema = Object.values(filesSchema.shape)[0];
                            if (firstFieldSchema instanceof z.ZodArray) {
                                validateStorageTypeMatch(firstFieldSchema.element, 'files.*');
                            }
                        }
                    }
                }
            }
        }

        for (const key in responses) {
            const { schema } = responses[key];
            const statusCode = schema.shape.statusCode.value.toString();

            if (statusCode === '204' || schema.shape.body instanceof z.ZodNull) {
                if (!(statusCode === '204' && schema.shape.body instanceof z.ZodNull)) {
                    throw new Error(
                        `Response validation failed for endpointId "${endpointId}": ` +
                        `Status code 204 and null body must be used together. ` +
                        `Found: statusCode=${statusCode}, body=${schema.shape.body instanceof z.ZodNull ? 'null' : 'non-null'}`
                    );
                }
            }

            const bodySchema = schema.shape.body;
            if (!(bodySchema instanceof z.ZodNull) && coreConfig.assertNoMutationsInInternalSchemas === true) {
                CoreZodUtils.assertNoMutations(bodySchema, `${endpointId}'s '${key}' response body schema`);
            }
        }
    }

    public clearAll(): void {
        this.endpointIds.clear();
        this.endpoints.clear();
        this.routeStructures.clear();
    }

    public parseSegments(path: RoutePath<any>): RouteSegment[] {
        const expressPath = path.getExpressPath();
        const segments = expressPath.split('/').filter(s => s.length > 0);

        return segments.map(segment => {
            if (segment.startsWith(':') === true) {
                return { type: 'param', name: segment.slice(1) };
            }
            return { type: 'static', value: segment };
        });
    }

    private toEndpointKey(path: RoutePath<any>, method: HttpMethod): string {
        return `${method} ${path.getExpressPath().toLowerCase()}`;
    }

    private toStructureKey(path: RoutePath<any>, method: HttpMethod): string {
        return `${method} ${path.getExpressPath().toLowerCase().replace(/:[^/]+/g, ':_')}`;
    }
}
