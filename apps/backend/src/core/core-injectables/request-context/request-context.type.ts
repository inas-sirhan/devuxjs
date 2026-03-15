import type { Request, Response } from 'express';



export type RequestContext = {
    readonly req: Request;
    readonly res: Response;
};

