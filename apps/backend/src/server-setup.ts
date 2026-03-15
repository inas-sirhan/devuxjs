import '@/core/utils/load-env';
import { globalErrorsHandler } from '@/infrastructure/express/middlewares/global-errors-handler.middleware';
import { requestTiming } from '@/infrastructure/express/middlewares/request-timing.middleware';
import express from 'express';
import http from 'http';

export async function setupServer(app: express.Express, setupEndpoints: () => void): Promise<() => Promise<void>> {

    app.use(requestTiming);

    setupEndpoints();

    app.use(globalErrorsHandler);

    const server = http.createServer(app);

    return async () => {
        
        const port = Number(process.env.PORT);

        server.listen(port, process.env.HOST, () => {
            console.log(`starting server on port ${port}`);
        });

    };
}
