import type * as z from 'zod';
import type { Responses } from '@/core/types/core.types';
import { ApiError } from '@packages/shared-core/utils/define-api-error';
import { ApiErrors } from '@packages/shared-app/api-errors/api-errors';


export interface FetchResponse {
    data: unknown;
    status: number;
    headers: Headers;
}

export type AnyApiFn = (customFetch: typeof fetch, ...args: any[]) => Promise<FetchResponse>;

type ApiFnInputSlot<F extends AnyApiFn> =
    Parameters<F> extends [typeof fetch, infer B, RequestInit?] ? [input: B] :
    Parameters<F> extends [typeof fetch, RequestInit?] ? [] :
    never;

export interface E2ETesterConfig<TResponses extends Responses, TApiFn extends AnyApiFn> {
    responses: TResponses;
    apiFn: TApiFn;
}


export abstract class E2ETester<TResponses extends Responses, TApiFn extends AnyApiFn> {

    public constructor(
        private readonly config: E2ETesterConfig<TResponses, TApiFn>,
    ) {}

    public async execute<K extends keyof TResponses>(
        customFetch: typeof fetch,
        ...args: [...ApiFnInputSlot<TApiFn>, expectedResponseKey: K, options?: RequestInit]
    ): Promise<{ statusCode: number; body: z.infer<TResponses[K]['schema']>; headers: Headers }>;

    public async execute<K extends keyof typeof ApiErrors>(
        customFetch: typeof fetch,
        ...args: [...ApiFnInputSlot<TApiFn>, errorClass: typeof ApiError, expectedApiErrorKey: K, options?: RequestInit]
    ): Promise<{ statusCode: (typeof ApiErrors)[K]['statusCode']; body: z.infer<(typeof ApiErrors)[K]['schema']>; headers: Headers }>;

    public async execute(
        customFetch: typeof fetch,
        ...args: unknown[]
    ): Promise<{ statusCode: number; body: unknown; headers: Headers }> {
        const hasInputParam = this.config.apiFn.length >= 3;
        const input = hasInputParam ? args[0] : undefined;
        const [responseKeyOrErrorClass, apiErrorKeyOrOptions, maybeOptions] = hasInputParam ? args.slice(1) : args;

        const isResponseKeyPath = typeof responseKeyOrErrorClass === 'string';
        const options = isResponseKeyPath
            ? apiErrorKeyOrOptions as RequestInit | undefined
            : maybeOptions as RequestInit | undefined;

        type AnyApiFnArgs = (customFetch: typeof fetch, ...rest: unknown[]) => Promise<FetchResponse>;
        const apiFn = this.config.apiFn as AnyApiFnArgs;
        const result = hasInputParam
            ? await apiFn(customFetch, input, options)
            : await apiFn(customFetch, options);

        if (typeof responseKeyOrErrorClass === 'string') {
            const expectedResponseKey = responseKeyOrErrorClass;
            const expectedResponse = this.config.responses[expectedResponseKey];

            const expectedStatusCode = expectedResponse.schema.shape.statusCode.value;
            if (result.status !== expectedStatusCode) {
                throw new Error(`Expected status ${expectedStatusCode}, got ${result.status}`);
            }

            const response = {
                statusCode: result.status,
                body: result.data,
            };
            const parsed = expectedResponse.schema.parse(response);
            return {
                statusCode: parsed.statusCode,
                body: parsed.body,
                headers: result.headers,
            };
        }

        const apiErrorKey = apiErrorKeyOrOptions as keyof typeof ApiErrors | undefined;

        if (apiErrorKey === undefined) {
            throw new Error('apiErrorKey is required when expecting an ApiError');
        }

        const expectedApiError = ApiErrors[apiErrorKey];

        if (result.status !== expectedApiError.statusCode) {
            throw new Error(`Expected status ${expectedApiError.statusCode}, got ${result.status}`);
        }

        return {
            statusCode: result.status,
            body: expectedApiError.schema.parse(result.data),
            headers: result.headers,
        };
    }
}
