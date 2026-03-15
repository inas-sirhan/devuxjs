import { createZodObject } from '@packages/shared-core/zod/shared.core.zod.utils';
import * as z from 'zod';


export function zodResult<TData extends z.ZodType<Record<string, unknown>>, TErrorCode extends string>(
    schemas: {
        data: TData;
        errorCodes: [TErrorCode, ...TErrorCode[]];
    }
) {
    return z.discriminatedUnion('success', 
    [
        createZodObject({
            success: z.literal(true),
            data: schemas.data,
        }), 
        createZodObject({
            success: z.literal(false),
            errorCode: z.enum(schemas.errorCodes),
        })
    ]
    );
}

export function zodResultNoData<TErrorCode extends string>(
    schemas: {
        errorCodes: [TErrorCode, ...TErrorCode[]];
    }
) {
    return z.discriminatedUnion('success', 
    [
        createZodObject({
            success: z.literal(true),
        }), 
        createZodObject({
            success: z.literal(false),
            errorCode: z.enum(schemas.errorCodes),
        })
    ]
    );
}

export function zodResultNoError<TData extends z.ZodType<Record<string, unknown>>>(
    schemas: {
        data: TData;
    }
) {
    return z.discriminatedUnion('success', 
    [
        createZodObject({
            success: z.literal(true),
            data: schemas.data,
        }), 
        createZodObject({
            success: z.literal(false),
            errorCode: z.never(),
        })
    ]
    );
}

export function zodResultVoid() {
    return z.discriminatedUnion('success', 
    [
        createZodObject({
            success: z.literal(true),
        }), 
        createZodObject({
            success: z.literal(false),
            errorCode: z.never(),
        })
    ]
    );
}

