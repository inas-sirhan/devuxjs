import type { HttpMethod } from '@/core/types/core.types';
import type { RouteConfig } from '@/core/utils/setup-endpoint.core.utils';




export function defineRouteConfig<
    M extends HttpMethod,
    IsFileUpload extends boolean = false
>(
    config: RouteConfig<M, IsFileUpload>
): RouteConfig<M, IsFileUpload> {
    return config;
}
