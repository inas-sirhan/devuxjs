import { defineDiToken, createInjectFn } from '@/core/utils/di-tokens.core.utils';


export const AccessGuardDiToken = defineDiToken('AccessGuard');
export const injectAccessGuard = createInjectFn(AccessGuardDiToken);
