import { AccessGuard } from '@/app-services/access-guard/access-guard';
import type { IAccessGuard } from '@/app-services/access-guard/access-guard.interface';
import { AccessGuardDiToken } from '@/__internals__/app-services/access-guard/access-guard.inversify.tokens';
import type { RequestContainer } from '@/core/containers/request-container';



export function setupAccessGuardBindings(requestContainer: RequestContainer) {
    requestContainer.bindRequestSingleton<IAccessGuard>(AccessGuardDiToken, AccessGuard);
}
