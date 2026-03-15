import { defineDiToken, createInjectFn } from '@/core/utils/di-tokens.core.utils';


export const CoreHooksDiToken = defineDiToken('CoreHooks');
export const injectCoreHooks = createInjectFn(CoreHooksDiToken);
