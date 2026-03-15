import type { RequestContainer } from '@/core/containers/request-container';
import { RequestContextDiToken } from '@/core/core-injectables/request-context/request-context.inversify.tokens';
import type { RequestContext } from '@/core/core-injectables/request-context/request-context.type';


export function setupRequestContextBindings(requestContainer: RequestContainer, value: RequestContext) {
    requestContainer.bindRequestConstantValue<RequestContext>(RequestContextDiToken, value);
}

