
import type { NextFunction, Request, Response } from 'express';

export function disableResponsesCaching(_req: Request, res: Response, next: NextFunction) {
    res.setHeader('Cache-Control', 'no-store');
    next();
}
