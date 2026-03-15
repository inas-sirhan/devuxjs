import type { RequestContainer } from '@/core/containers/request-container';

import type * as z from 'zod';

export type EndpointBindingsConfig =  {
    controllerSymbol: symbol,
    presenterSymbol: symbol,
    setupEndpointBindings: (requestContainer: RequestContainer) => void,
};

export type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

export type RequestSchema = z.ZodType<Record<string, unknown>>;

export type ResponseBodySchema = z.ZodType<Record<string, unknown>>;
export type ResponseSchemaShape = {
    statusCode: z.ZodLiteral<number>,
    body: ResponseBodySchema | z.ZodNull
};
export type ResponseShape = z.infer<z.ZodObject<ResponseSchemaShape>>;

export type ResponsesShape = Record<string, ResponseShape>;


export type Responses = {
    [key: string]: {
        schema: z.ZodObject<ResponseSchemaShape, 'strict'>; 
        value: (...args: any[]) => ResponseShape;
        description?: string;
    };
};


export type AreExact<A, B> =
    (<G>() => G extends A ? 1 : 2) extends
    (<G>() => G extends B ? 1 : 2)
        ? true
        : false;

export type AssertTrue<T extends true> = T;

type AllKeysMatch<T extends Record<string, boolean>> = false extends T[keyof T] ? false : true;

export type ValidResponsesOrNever<T extends Responses> =
    AllKeysMatch<{
        [K in keyof T]: AreExact<ReturnType<T[K]['value']>, z.infer<T[K]['schema']>>;
    }> extends true ? T : never;

export type AssertValidResponses<T extends Responses> = ValidResponsesOrNever<T> extends never ? false : true;


export type ExtractResponsesSchemasTypes<TResponses extends Responses> = {
    [K in keyof TResponses]: z.infer<TResponses[K]['schema']>;
};

export type SafeExtract<T, U extends T> = Extract<T, U>;

export type SafeOmit<T, K extends keyof T> = Omit<T, K>;



export type RequireOnlyOne<T> = {
    [K in keyof T]: Required<Pick<T, K>> & Partial<Record<Exclude<keyof T, K>, never>>
}[keyof T];



type Primitive = string | number | boolean | null | undefined | symbol | bigint;

type DottedPathMaxDepth = 10;

type DottedPathHelper<
    T,
    Depth extends unknown[] = []
> = Depth['length'] extends DottedPathMaxDepth
    ? never
    : T extends any
        ? T extends Primitive
            ? never
            : {
                [K in keyof T & string]:
                    T[K] extends any[]
                        ? `${K}`
                        : T[K] extends object
                            ? `${K}` | `${K}.${DottedPathHelper<T[K], [...Depth, unknown]>}`
                            : `${K}`
            }[keyof T & string]
        : never;

export type DottedPath<T> = DottedPathHelper<T> | '';


export type GeneratorConfig = {
    routeConfig: {
        generateSummary: boolean;
        generateDescription: boolean;
        generateExtraTags: boolean;
        generateMiddlewares: boolean;
    };
    responses: {
        generateDescription: boolean;
    };
    repo: {
        generateUniqueKeyViolationErrorMap: boolean;
        generateForeignKeyViolationErrorMap: boolean;
    };
};

export type CoreConfig = {
    transactionMaxAttempts: number;
    baseDelayBetweenTransactionRetriesMillis: number;
    useCaseDurationThresholdMillis: number;
    repoDurationThresholdMillis: number;
    domainServiceDurationThresholdMillis: number;
    jsonBodyParser: {
        maxBodySizeBytes: number;
    };
    queryParamsParser: {
        parameterLimit: number;
        depthLimit: number;
        arrayLimit: number;
    };
    fileUpload: {
        maxFieldNameSizeBytes: number;
        maxFieldValueSizeBytes: number;
    };

    isDevelopment: boolean;
    isTesting: boolean;
    isProduction: boolean;

    syncApi: boolean;

    assertNoMutationsInInternalSchemas: boolean;

    generator: GeneratorConfig;

};



export type CheckDatabaseErrorResult = {
    type: 'unique';
    constraint: string;
} | {
    type: 'foreign';
    constraint: string;
} | {
    type: 'serialization';
} | {
    type: 'deadlock';
} | {
    type: 'other';
};
