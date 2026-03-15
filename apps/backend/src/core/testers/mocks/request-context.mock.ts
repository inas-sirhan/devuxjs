import type { Request, Response } from 'express';
import type { RequestContext } from '@/core/core-injectables/request-context/request-context.type';


export function createMockRequestContext(options?: {
    req?: Partial<Request>;
    res?: Partial<Response>;
}): RequestContext {
    return {
        req: (options?.req ?? {}) as Request,
        res: (options?.res ?? {}) as Response,
    };
}
