
import type { NextFunction, Request, Response } from 'express';


export function responseHandler(_req: Request, res: Response, _next: NextFunction) {

    const response = res.locals.presenterResponse;
    res.status(response.statusCode);
    if (response.body === null) { 
        res.send();
    }
    else {
        res.json(response.body);
    }

}

