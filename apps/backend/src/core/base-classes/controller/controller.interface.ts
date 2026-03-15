
export interface IController {
    handle(input: unknown): Promise<void>;
    assertCanAccess(): Promise<void>;
}

