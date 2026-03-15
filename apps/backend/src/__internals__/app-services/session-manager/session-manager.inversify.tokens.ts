import { defineDiToken, createInjectFn } from '@/core/utils/di-tokens.core.utils';


export const SessionManagerDiToken = defineDiToken('SessionManager');
export const injectSessionManager = createInjectFn(SessionManagerDiToken);
