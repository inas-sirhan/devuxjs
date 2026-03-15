import { UserContext } from '@/app-services/user-context/user-context';
import type { IUserContext } from '@/app-services/user-context/user-context.interface';
import { UserContextDiToken } from '@/__internals__/app-services/user-context/user-context.inversify.tokens';
import type { RequestContainer } from '@/core/containers/request-container';

export function setupUserContextBindings(requestContainer: RequestContainer) {
    requestContainer.bindRequestSingleton<IUserContext>(UserContextDiToken, UserContext);
}
