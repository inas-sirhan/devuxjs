
import { ApiErrors } from '@packages/shared-app/api-errors/api-errors';
import { ApiError } from '@packages/shared-core/utils/define-api-error';
import type { NextFunction, Request, Response } from 'express';


export function globalErrorsHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {

    if (error instanceof ApiError) {
        res.status(error.statusCode).json(error.body);
        return;
    }
    else {
        const unexpectedApiError = ApiErrors['UnexpectedError'].create();
        res.status(unexpectedApiError.statusCode).json(unexpectedApiError.body);
        return;
    }
}

