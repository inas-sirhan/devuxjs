import type { Request, Response, NextFunction } from 'express';

export function requestTiming(req: Request, res: Response, next: NextFunction): void {
    const startTime = performance.now();

    res.on('close', () => {
        const durationMs = performance.now() - startTime;
        const aborted = res.writableFinished === false; 

        const parts = [
            `request took: ${durationMs.toFixed(2)}ms`,
            `[method: ${req.method}]`,
            `[path: ${req.path}]`,
            `[status: ${res.statusCode}]`,
        ];

        if (req.endpointId !== undefined) {
            parts.push(`[endpointId: ${req.endpointId}]`);
        }

        if (req.route?.path !== undefined) {
            parts.push(`[route: ${req.route.path}]`);
        }

        if (aborted === true) {
            parts.push(`[ABORTED]`);
        }

        console.log(parts.join(' '));
    });

    next();
}
