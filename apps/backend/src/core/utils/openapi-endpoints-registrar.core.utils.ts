import type { RoutePath } from '@/core/utils/route-path.core.utils';
import type { HttpMethod, RequestSchema, Responses } from '@/core/types/core.types';
import type { FileUploadOptions } from '@/core/utils/setup-endpoint.core.utils';
import { CoreZodUtils } from '@/core/utils/zod.core.utils';
import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import * as z from 'zod';
import { FileUploadErrors } from '@packages/shared-core/api-errors/core.api-errors';
import { zodStrictOmit, zodStrictPick } from '@packages/shared-core/zod/shared.core.zod.utils';



export class OpenApiEndpointsRegistrar {
    private registry: OpenAPIRegistry;

    public constructor() {
        this.registry = new OpenAPIRegistry();
    }

    public getRegistry(): OpenAPIRegistry {
        return this.registry;
    }


    public registerRoute(params: {
        path: RoutePath<any>;
        method: HttpMethod;
        operationId: string;
        summary?: string;
        description?: string;
        extraTags?: string[];
        requestSchema: RequestSchema;
        responses: Responses;
        fileUploadConfig: FileUploadOptions | null;
    }): void {

        const { path, method, operationId, summary, description, extraTags, requestSchema, responses, fileUploadConfig } = params;

        const pathParamsFromRoutePath = path.getPathParams();
        const hasPathParams = pathParamsFromRoutePath.length !== 0;
        const pathParams: Record<string, true> = {};

        for (const param of pathParamsFromRoutePath) {
            pathParams[param] = true;
        }

        const openApiRequest: Exclude<Parameters<OpenAPIRegistry['registerPath']>[0]['request'], undefined> = {};

        if (hasPathParams === true) {
            openApiRequest.params = zodStrictPick(CoreZodUtils.getUnionOptions(requestSchema)[0], pathParams as any);
        }

        const schemaWithoutPathParams = hasPathParams === false
            ? requestSchema
            : CoreZodUtils.omitFromSchema(requestSchema, pathParams as any);


        if (fileUploadConfig !== null) {
            const schema = CoreZodUtils.unwrapZodEffects(schemaWithoutPathParams) as z.ZodObject<z.ZodRawShape, 'strict'>;
            const shape = schema.shape;

            let schemaWithFileMarked: typeof schema;

            if (fileUploadConfig.mode === 'single') {
                schemaWithFileMarked = schema.extend({
                    file: shape.file.openapi({ type: 'string', format: 'binary' }),
                });
            }
            else {
                if (fileUploadConfig.mode === 'array') {
                    schemaWithFileMarked = schema.extend({
                        files: shape.files.openapi({ type: 'array', items: { type: 'string', format: 'binary' } }),
                    });
                }
                else {
                    const flatFields: z.ZodRawShape = {};
                    for (const field of fileUploadConfig.fields) {
                        flatFields[field.name] = (shape.files as z.ZodObject<z.ZodRawShape>).shape[field.name].openapi({
                            type: 'array',
                            items: { type: 'string', format: 'binary' }
                        });
                    }
                    schemaWithFileMarked = zodStrictOmit(schema, { files: true } as any).extend(flatFields);
                }
            }

            openApiRequest.body = {
                'content': {
                    'multipart/form-data': {
                        schema: schemaWithFileMarked,
                    },
                },
                required: true,
            };
        }
        else {
            if (CoreZodUtils.isEmpty(schemaWithoutPathParams) === false) {
                if (method === 'get' || method === 'delete') {
                    openApiRequest.query = schemaWithoutPathParams as typeof openApiRequest.query;
                }
                else {
                    openApiRequest.body = {
                        'content': {
                            'application/json': {
                                schema: schemaWithoutPathParams,
                            },
                        },
                        required: true,
                    };
                }
            }
        }


        const allTags = [path.getDomainName(), ...(extraTags ?? [])];
        const uniqueTags = Array.from(new Set(allTags));

        this.registry.registerPath({
            method,
            path: path.getOpenApiPath(),
            operationId,
            summary: summary ?? '',
            description: description ?? summary ?? '',
            request: openApiRequest,

            responses: this.toOpenApiResponsesUnion(responses, fileUploadConfig !== null),

            tags: uniqueTags,

        });
    }

    private toOpenApiResponsesUnion(responses: Responses, isFileUpload: boolean) {

        const responsesUnion: Record<string, { description: string; schema: z.ZodTypeAny }> = {};

        if (isFileUpload === true) {
            for (const [key, error] of Object.entries(FileUploadErrors)) {
                const statusCode = error.statusCode.toString();
                const schema = error.schema;

                const alreadyExists = responsesUnion[statusCode] !== undefined;
                if (alreadyExists === true) {
                    const existingSchema = responsesUnion[statusCode].schema;
                    responsesUnion[statusCode] = {
                        description: responsesUnion[statusCode].description + '\n- ' + `File upload: ${key}`,
                        schema: z.union([existingSchema, schema]),
                    };
                }
                else {
                    responsesUnion[statusCode] = {
                        description: "- " + `File upload: ${key}`,
                        schema: schema,
                    };
                }
            }
        }

        for (const key in responses) {
            const { schema, description } = responses[key];
            const statusCode = schema.shape.statusCode.value.toString();

            const alreadyExists = responsesUnion[statusCode] !== undefined;
            if (alreadyExists === true) {
                const existingSchema = responsesUnion[statusCode].schema;
                responsesUnion[statusCode] = {
                    description: responsesUnion[statusCode].description + '\n- ' + description,
                    schema: z.union([existingSchema, schema.shape.body]),
                };
            } 
            else {
                responsesUnion[statusCode] = {
                    description: "- " + description,
                    schema: schema.shape.body,
                };
            }
        }

        const openApiResponses: Parameters<OpenAPIRegistry['registerPath']>[0]['responses'] = {};
        for (const statusCode in responsesUnion) {
            if (statusCode === '204' || responsesUnion[statusCode].schema instanceof z.ZodNull) {
                openApiResponses[statusCode] = {
                    description: responsesUnion[statusCode].description,
                };
            }
            else {
                openApiResponses[statusCode] = {
                    description: responsesUnion[statusCode].description,
                    content: {
                        'application/json': {
                            schema: responsesUnion[statusCode].schema,
                        },
                    },
                };
            }
        }

        return openApiResponses;
    }
}
