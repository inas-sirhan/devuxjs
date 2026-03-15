
import type { AppContainer } from '@/core/containers/app-container';
import type { QueryParamsParserOptions } from '@/core/utils/setup-endpoint.core.utils';
import { coreConfig } from '@/infrastructure/core/core.config';
import type { NextFunction, Request, Response } from 'express';
import qs from 'qs';



export function createQueryParamsParser(
    container: AppContainer,
    options?: QueryParamsParserOptions,
) {
    const config = coreConfig.queryParamsParser;
    const parameterLimit = options?.parameterLimit ?? config.parameterLimit;
    const depthLimit = options?.depthLimit ?? config.depthLimit;
    const arrayLimit = options?.arrayLimit ?? config.arrayLimit;

    const cacheKey = JSON.stringify({ parameterLimit, depthLimit, arrayLimit });
    const cache = container.getQueryParamsParsersCache();

    if (cache.has(cacheKey) === true) {
        return cache.get(cacheKey)!;
    }

    const middleware = (req: Request, _res: Response, next: NextFunction) => {
        const queryIndex = req.originalUrl.indexOf('?');
        if (queryIndex >= 0) {
            const rawQuery = req.originalUrl.slice(queryIndex + 1);
            req.parsedQuery = qs.parse(rawQuery, {
                allowPrototypes: false, 
                plainObjects: true,
                parameterLimit,
                depth: depthLimit,
                strictDepth: true,
                arrayLimit,
                parseArrays: true, 
                throwOnLimitExceeded: true,
                allowEmptyArrays: true,
                allowSparse: false,
                duplicates: 'last',
            });
        }
        else {
            req.parsedQuery = {}; 
        }
        next();
    };

    cache.set(cacheKey, middleware);

    return middleware;
}
