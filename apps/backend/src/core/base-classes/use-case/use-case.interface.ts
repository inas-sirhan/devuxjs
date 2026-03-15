


export interface IUseCase<TRequest> {
    execute(input: TRequest): Promise<void>;
    assertCanAccess(): Promise<void>;
}