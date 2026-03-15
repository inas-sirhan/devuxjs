import type { NextFunction, Request, Response } from 'express';


export async function routeHandler(req: Request, res: Response, next: NextFunction) {
    const controller = req.requestContainer.getController();
    await controller.assertCanAccess();
    const input = {
        ...req.params,
        ...req.parsedQuery,
        ...req.body,
    }; 
    await controller.handle(input); 
    const presenter = req.requestContainer.getPresenter();
    const response = presenter.getResponseOrThrow();
    res.locals.presenterResponse = response; 
    next();
}

