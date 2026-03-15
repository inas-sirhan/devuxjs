import { AppServiceTester } from '@/core/testers/app-service.tester';
import { setupSessionManagerBindings } from '@/__internals__/app-services/session-manager/session-manager.inversify.bindings';
import { SessionManagerDiToken } from '@/__internals__/app-services/session-manager/session-manager.inversify.tokens';
import type { ISessionManager } from '@/app-services/session-manager/session-manager.interface';


type SessionManagerTesterDeps = {

}

const validDeps: ReadonlySet<string> = new Set([
    
]);


export class SessionManagerTester extends AppServiceTester<ISessionManager, SessionManagerTesterDeps> {
    public constructor() {
        super({
            setupServiceBindings: setupSessionManagerBindings,
            serviceToken: SessionManagerDiToken,
            isGlobal: false,
            validDeps,
        });
    }
}
