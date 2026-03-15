import { SessionManager } from '@/app-services/session-manager/session-manager';
import type { ISessionManager } from '@/app-services/session-manager/session-manager.interface';
import { SessionManagerDiToken } from '@/__internals__/app-services/session-manager/session-manager.inversify.tokens';
import type { RequestContainer } from '@/core/containers/request-container';



export function setupSessionManagerBindings(requestContainer: RequestContainer) {
    requestContainer.bindRequestSingleton<ISessionManager>(SessionManagerDiToken, SessionManager);
}
