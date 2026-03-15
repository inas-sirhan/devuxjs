import type * as z from 'zod';
import type { Responses } from '@/core/types/core.types';
import { ApiError } from '@packages/shared-core/utils/define-api-error';
import { ApiErrors } from '@packages/shared-app/api-errors/api-errors';


export interface FetchResponse {
    data: unknown;
    status: number;
    headers: Headers;
}

type ApiFnWithInput<TRequest> = (customFetch: typeof fetch, input: TRequest, options?: RequestInit) => Promise<FetchResponse>;
type ApiFnWithoutInput = (customFetch: typeof fetch, options?: RequestInit) => Promise<FetchResponse>;

export interface E2ETesterConfig<TResponses extends Responses, TRequest> {
    responses: TResponses;
    apiFn: ApiFnWithInput<TRequest> | ApiFnWithoutInput;
}


export abstract class E2ETester<TResponses extends Responses, TRequest> {

    public constructor(
        private readonly config: E2ETesterConfig<TResponses, TRequest>,
    ) {}

    public async execute<K extends keyof TResponses>(
        customFetch: typeof fetch,
        input: TRequest,
        expectedResponseKey: K,
        options?: RequestInit
    ): Promise<{ statusCode: number; body: z.infer<TResponses[K]['schema']>; headers: Headers }>;

    public async execute<K extends keyof typeof ApiErrors>(
        customFetch: typeof fetch,
        input: TRequest,
        errorClass: typeof ApiError,
        expectedApiErrorKey: K,
        options?: RequestInit
    ): Promise<{ statusCode: (typeof ApiErrors)[K]['statusCode']; body: z.infer<(typeof ApiErrors)[K]['schema']>; headers: Headers }>;

    public async execute(
        customFetch: typeof fetch,
        input: TRequest,
        responseKeyOrErrorClass: keyof TResponses | typeof ApiError,
        apiErrorKeyOrOptions?: keyof typeof ApiErrors | RequestInit,
        maybeOptions?: RequestInit
    ): Promise<{ statusCode: number; body: unknown; headers: Headers }> {
        const isResponseKeyPath = typeof responseKeyOrErrorClass === 'string';
        const options = isResponseKeyPath
            ? apiErrorKeyOrOptions as RequestInit | undefined
            : maybeOptions;

        const hasInputParam = this.config.apiFn.length >= 3;

        const result = hasInputParam
            ? await (this.config.apiFn as ApiFnWithInput<TRequest>)(customFetch, input, options)
            : await (this.config.apiFn as ApiFnWithoutInput)(customFetch, options);

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
