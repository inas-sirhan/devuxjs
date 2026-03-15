import { AppServiceTester } from '@/core/testers/app-service.tester';
import { setupSessionContextBindings } from '@/__internals__/app-services/session-context/session-context.inversify.bindings';
import { SessionContextDiToken } from '@/__internals__/app-services/session-context/session-context.inversify.tokens';
import type { ISessionContext } from '@/app-services/session-context/session-context.interface';


type SessionContextTesterDeps = {

}

const validDeps: ReadonlySet<string> = new Set([
    
]);


export class SessionContextTester extends AppServiceTester<ISessionContext, SessionContextTesterDeps> {
    public constructor() {
        super({
            setupServiceBindings: setupSessionContextBindings,
            serviceToken: SessionContextDiToken,
            isGlobal: false,
            validDeps,
        });
    }
}
