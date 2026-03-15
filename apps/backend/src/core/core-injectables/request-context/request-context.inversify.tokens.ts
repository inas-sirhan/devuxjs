import { defineDiToken, createInjectFn } from '@/core/utils/di-tokens.core.utils';


export const RequestContextDiToken = defineDiToken('RequestContext');
export const injectRequestContext = createInjectFn(RequestContextDiToken);
