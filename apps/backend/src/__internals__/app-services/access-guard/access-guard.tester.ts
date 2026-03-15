import { AppServiceTester } from '@/core/testers/app-service.tester';
import { setupAccessGuardBindings } from '@/__internals__/app-services/access-guard/access-guard.inversify.bindings';
import { AccessGuardDiToken } from '@/__internals__/app-services/access-guard/access-guard.inversify.tokens';
import type { IAccessGuard } from '@/app-services/access-guard/access-guard.interface';


type AccessGuardTesterDeps = {

}

const validDeps: ReadonlySet<string> = new Set([
    
]);


export class AccessGuardTester extends AppServiceTester<IAccessGuard, AccessGuardTesterDeps> {
    public constructor() {
        super({
            setupServiceBindings: setupAccessGuardBindings,
            serviceToken: AccessGuardDiToken,
            isGlobal: false,
            validDeps,
        });
    }
}
