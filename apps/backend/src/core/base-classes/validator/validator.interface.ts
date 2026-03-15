

export interface IValidator<T> {
    validate(input: unknown): T;
}
