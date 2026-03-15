import { AppServiceTester } from '@/core/testers/app-service.tester';
import { setupUserContextBindings } from '@/__internals__/app-services/user-context/user-context.inversify.bindings';
import { UserContextDiToken } from '@/__internals__/app-services/user-context/user-context.inversify.tokens';
import type { IUserContext } from '@/app-services/user-context/user-context.interface';


type UserContextTesterDeps = {

}

const validDeps: ReadonlySet<string> = new Set([
    
]);


export class UserContextTester extends AppServiceTester<IUserContext, UserContextTesterDeps> {
    public constructor() {
        super({
            setupServiceBindings: setupUserContextBindings,
            serviceToken: UserContextDiToken,
            isGlobal: false,
            validDeps,
        });
    }
}
