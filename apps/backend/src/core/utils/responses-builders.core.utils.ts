import type { Responses, ResponseSchemaShape, ResponseBodySchema } from '@/core/types/core.types';
import { createZodObject } from '@packages/shared-core/zod/shared.core.zod.utils';
import * as z from 'zod';



export function getBodySchemaFromResponse<TResponses extends Responses, K extends keyof TResponses>(responses: TResponses, key: K): typeof responses[K]['schema']['shape']['body'] {
    assertValidSuccessStatusCode(responses[key]['schema']['shape']['statusCode'].value );
    return responses[key]['schema']['shape']['body'];
}

function assertIntegerStatusCode(statusCode: number) {
    if (Number.isInteger(statusCode) === false) {
        throw new Error(`success statusCode must be an integer! got ${statusCode}`);
    }
}

function assertValidSuccessStatusCode(statusCode: number) {
    assertIntegerStatusCode(statusCode);
    if (statusCode < 200 || statusCode >= 300) {
        throw new Error(`success statusCode must be in the range of 200-299, got ${statusCode}`);
    }
}

export function createSuccessApiResponse<const TStatusCode extends number, TDataSchema extends ResponseBodySchema>(
    params: {
        readonly statusCode: TStatusCode,
        readonly dataSchema: TDataSchema,
        readonly description?: string,
    } & (
        number extends TStatusCode
            ? { __warn_statusCode__: 'statusCode must be a literal (e.g. 200 as const)' }
            : {}
    )
) {

    const { statusCode, dataSchema, description } = params;

    assertValidSuccessStatusCode(statusCode);

    const schema = createZodObject({
        statusCode: z.literal(statusCode),
        body: dataSchema,
    } satisfies ResponseSchemaShape);

    const value = (data: z.infer<typeof dataSchema>) => ({
        statusCode,
        body: data,
    } satisfies z.infer<typeof schema>);

    return {
        ...(description !== undefined && { description }),
        schema,
        value,
    };
}


export function createSuccess204NoContentApiResponse(params?: {
    readonly description?: string,
}) {
    const statusCode = 204 as const;
    const description = params?.description;

    assertValidSuccessStatusCode(statusCode);

    const schema = createZodObject({
        statusCode: z.literal(statusCode),
        body: z.null(),
    } satisfies ResponseSchemaShape);

    const value = () => ({
        statusCode,
        body: null,
    } satisfies z.infer<typeof schema>);

    return {
        ...(description !== undefined && { description }),
        schema,
        value,
    };
}

export function createUpdateApiResponse<K extends string>(
    key: K & (
        string extends K
            ? { __warn_key__: 'key must be literal' }
            : {}
    ),
    params?: {
        readonly changedDescription?: string,
        readonly noChangesDescription?: string,
    }
) {

    const noChangesDetectedKey = 'NoChangesDetected' as const;
    const detectedChangesAndUpdated = 'detectedChangesAndUpdated' as const;

    const noChangesDetectedSchema = createZodObject({
        statusCode: z.literal(200),
        body: createZodObject({
            [detectedChangesAndUpdated]: z.literal(false),
        }),
    } satisfies ResponseSchemaShape);

    const noChangesDetectedResponse = {
        [noChangesDetectedKey]: {
            description: params?.noChangesDescription ?? 'no changes detected, no update was performed.',
            schema: noChangesDetectedSchema,
            value: () => {
                return {
                    statusCode: 200, 
                    body: {
                        [detectedChangesAndUpdated]: false,
                    },
                } satisfies z.infer<typeof noChangesDetectedSchema>;
            }
        },
    } satisfies Responses;

    const keySchema = createZodObject({
        statusCode: z.literal(200),
        body: createZodObject({
            [detectedChangesAndUpdated]: z.literal(true),
        }),
    } satisfies ResponseSchemaShape);

    const updatedSuccessfullyResponse = {
        [key]: {
            description: params?.changedDescription ?? 'updated successfully',
            schema: keySchema,
            value: () => {
                return {
                    statusCode: 200,
                    body: {
                        [detectedChangesAndUpdated]: true,
                    },
                } satisfies z.infer<typeof keySchema>;
            }
        }
    } satisfies Responses;

    return {
        ...noChangesDetectedResponse,
        ...updatedSuccessfullyResponse as Record<K, typeof updatedSuccessfullyResponse[K]>,
    };
}

function assertValidErrorStatusCode(statusCode: number) {
    assertIntegerStatusCode(statusCode);
    if (statusCode < 400 || statusCode >= 600) {
        throw new Error(`error statusCode must be in the range of 400-599, got ${statusCode}`);
    }
}

export function createErrorApiResponse<const TStatusCode extends number, TErrorCode extends string, TPath extends string>(
    params: {
        readonly statusCode: TStatusCode,
        readonly errorCode: TErrorCode,
        readonly path: TPath,
        readonly description?: string,
    } & (
        number extends TStatusCode
            ? { __warn_statusCode__: 'statusCode must be a literal (e.g. 409 as const)' }
            : {}
    ) & (
        string extends TErrorCode
            ? { __warn_errorCode__: 'errorCode must be a literal string (e.g. "city_already_exists")' }
            : {}
    ) & (
        string extends TPath
            ? { __warn_path__: 'path must be a literal string (e.g. "name")' }
            : {}
    )
) {
    const { statusCode, errorCode, path, description } = params;

    assertValidErrorStatusCode(statusCode);

    const errorType = 'business';

    const schema = createZodObject({
        statusCode: z.literal(statusCode),
        body: createZodObject({
            errorType: z.literal(errorType),
            errorCode: z.literal(errorCode),
            path: z.literal(path),
        }),
    } satisfies ResponseSchemaShape);

    const value = () => ({
        statusCode,
        body: {
            errorType,
            errorCode,
            path,
        }
    } satisfies z.infer<typeof schema>);

    return {
        ...(description !== undefined && { description }),
        schema,
        value,
    };

}


export function createBulkErrorApiResponse<const TStatusCode extends number, TErrorItemSchema extends ResponseBodySchema>(
    params: {
        readonly statusCode: TStatusCode,
        readonly errorItemSchema: TErrorItemSchema,
        readonly description?: string,
    } & (
        number extends TStatusCode
            ? { __warn_statusCode__: 'statusCode must be a literal (e.g. 400 as const)' }
            : {}
    )
) {
    const { statusCode, errorItemSchema, description } = params;

    assertValidErrorStatusCode(statusCode);

    const errorType = 'business';
    const errorCode = 'bulk_business_error';

    const schema = createZodObject({
        statusCode: z.literal(statusCode),
        body: createZodObject({
            errorType: z.literal(errorType),
            errorCode: z.literal(errorCode),
            errors: z.array(errorItemSchema),
        }),
    } satisfies ResponseSchemaShape);

    const value = (errors: z.infer<typeof errorItemSchema>[]) => ({
        statusCode,
        body: {
            errorType,
            errorCode,
            errors,
        },
    } satisfies z.infer<typeof schema>);

    return {
        ...(description !== undefined && { description }),
        schema,
        value,
    };
}
