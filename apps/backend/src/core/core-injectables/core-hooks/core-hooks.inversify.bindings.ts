import type { AppContainer } from '@/core/containers/app-container';
import type { ICoreHooks } from '@/core/core-injectables/core-hooks/core-hooks.interface';
import { CoreHooksDiToken } from '@/core/core-injectables/core-hooks/core-hooks.inversify.tokens';
import { CoreHooks } from '@/infrastructure/core/core-hooks';



export function setupCoreHooksBindings(appContainer: AppContainer) {
    appContainer.bindGlobalSingleton<ICoreHooks>(CoreHooksDiToken, CoreHooks);
}

