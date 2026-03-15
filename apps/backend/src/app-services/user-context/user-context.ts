import type { IUserContext } from '@/app-services/user-context/user-context.interface';
import { injectable } from 'inversify';

@injectable()
export class UserContext implements IUserContext {
}
