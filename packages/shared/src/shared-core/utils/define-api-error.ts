
import { createZodObject } from '@packages/shared-core/zod/shared.core.zod.utils';
import * as z from 'zod';


export class ApiError extends Error {
    public constructor(
        public readonly statusCode: number,
        public readonly body: {
            errorType: string;
            errorCode: string;
            [key: string]: unknown;
        },
    ) {
        super();
    }
}



export function defineApiError<
    TStatusCode extends number,
    TErrorType extends string,
    TErrorCode extends string,
    TExtra extends z.ZodRawShape = {}
>(config: {
    statusCode: TStatusCode;
    errorType: TErrorType;
    errorCode: TErrorCode;
    extraSchema?: TExtra;
}) {
    const { statusCode, errorType, errorCode, extraSchema } = config;

    const baseShape = {
        errorType: z.literal(errorType),
        errorCode: z.literal(errorCode),
    };

    const schema = extraSchema
        ? createZodObject({ ...baseShape, ...extraSchema })
        : createZodObject(baseShape);

    type ExtraData = TExtra extends z.ZodRawShape ? z.infer<z.ZodObject<TExtra>> : never;
    type HasExtra = keyof TExtra extends never ? false : true;

    const create = (...args: unknown[]) => {
        const extra = args[0];
        return new ApiError(statusCode, {
            errorType,
            errorCode,
            ...(extra ?? {}),
        });
    };

    type BaseObjectFields = { errorType: z.ZodLiteral<TErrorType>; errorCode: z.ZodLiteral<TErrorCode> };

    type SchemaType = keyof TExtra extends never
        ? ReturnType<typeof createZodObject<BaseObjectFields>>
        : ReturnType<typeof createZodObject<BaseObjectFields & TExtra>>;

    return {
        statusCode,
        schema: schema as SchemaType,
        create: create as HasExtra extends true ? (extra: ExtraData) => ApiError : () => ApiError,
        throw: ((...args: unknown[]) => {
            throw create(...args);
        }) as HasExtra extends true ? (extra: ExtraData) => never : () => never,
    };

}
