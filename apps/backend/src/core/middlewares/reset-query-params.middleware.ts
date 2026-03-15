
import type { NextFunction, Request, Response } from 'express';


export function resetQueryParams(req: Request, _res: Response, next: NextFunction) {
    req.parsedQuery = {};
    next();
}
