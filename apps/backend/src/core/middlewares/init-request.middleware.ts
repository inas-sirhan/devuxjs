
import type { AppContainer } from '@/core/containers/app-container';
import type { EndpointBindingsConfig } from '@/core/types/core.types';
import type { NextFunction, Request, RequestHandler, Response } from 'express';



export function initRequest(
    appContainer: AppContainer,
    endpointBindings: EndpointBindingsConfig,
    endpointId: string
): RequestHandler {
    return function (req: Request, res: Response, next: NextFunction) {
        req.endpointId = endpointId;
        req.requestContainer = appContainer.createRequestContainer(endpointBindings); 
        req.requestContainer.attachRequestContext(req, res);
        next();
    }
}