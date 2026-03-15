import { SessionContext } from '@/app-services/session-context/session-context';
import type { ISessionContext } from '@/app-services/session-context/session-context.interface';
import { SessionContextDiToken } from '@/__internals__/app-services/session-context/session-context.inversify.tokens';
import type { RequestContainer } from '@/core/containers/request-container';



export function setupSessionContextBindings(requestContainer: RequestContainer) {
    requestContainer.bindRequestSingleton<ISessionContext>(SessionContextDiToken, SessionContext);
}
