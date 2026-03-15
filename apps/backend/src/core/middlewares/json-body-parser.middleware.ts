import type { AppContainer } from '@/core/containers/app-container';
import type { JsonBodyParserOptions } from '@/core/utils/setup-endpoint.core.utils';
import { coreConfig } from '@/infrastructure/core/core.config';
import express from 'express';


export function createJsonBodyParser(
    container: AppContainer,
    options?: JsonBodyParserOptions
): express.RequestHandler {
    const actualLimit = options?.maxBodySizeBytes ?? coreConfig.jsonBodyParser.maxBodySizeBytes;
    const cacheKey = String(actualLimit);
    const cache = container.getJsonBodyParsersCache();

    if (cache.has(cacheKey) === true) {
        return cache.get(cacheKey)!;
    }

    const middleware = express.json({
        limit: actualLimit,
    });
    cache.set(cacheKey, middleware);

    return middleware;
}

