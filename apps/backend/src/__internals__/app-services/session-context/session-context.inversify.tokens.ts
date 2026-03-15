import { defineDiToken, createInjectFn } from '@/core/utils/di-tokens.core.utils';


export const SessionContextDiToken = defineDiToken('SessionContext');
export const injectSessionContext = createInjectFn(SessionContextDiToken);
