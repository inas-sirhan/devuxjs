import type { NextFunction, Request, Response } from 'express';


export async function accessControlHandler(req: Request, _res: Response, next: NextFunction) {
    const controller = req.requestContainer.getController();
    await controller.assertCanAccess();
    next();
}

