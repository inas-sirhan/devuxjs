import { defineDiToken, createInjectFn } from '@/core/utils/di-tokens.core.utils';


export const UserContextDiToken = defineDiToken('UserContext');
export const injectUserContext = createInjectFn(UserContextDiToken);
