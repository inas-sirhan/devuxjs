import { CoreApiErrors } from '@packages/shared-core/api-errors/core.api-errors';
import { defineApiError } from '@packages/shared-core/utils/define-api-error';
import { ApiErrorCodes } from '@packages/shared-app/api-errors/api-errors.error-codes';
import * as z from 'zod';


export const ApiErrors = {

    /* CORE API ERRORS */
    ...CoreApiErrors,

    /* AUTHENTICATION */
    NotAuthenticated: defineApiError({
        statusCode: 401,
        errorType: 'authentication',
        errorCode: ApiErrorCodes['NotAuthenticated'],
    }),

    /* AUTHORIZATION */
    NotAuthorized: defineApiError({
        statusCode: 403,
        errorType: 'authorization',
        errorCode: ApiErrorCodes['NotAuthorized'],
    }),

} as const;


export const apiErrorsZodSchema = z.union(
    Object.values(ApiErrors).map(error => error.schema) as [
        (typeof ApiErrors)[keyof typeof ApiErrors]['schema'],
        (typeof ApiErrors)[keyof typeof ApiErrors]['schema'],
        ...(typeof ApiErrors)[keyof typeof ApiErrors]['schema'][]
    ]
);


export type ApiErrorsTypes = z.infer<typeof apiErrorsZodSchema>;
