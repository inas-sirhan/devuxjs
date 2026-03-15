
const errorCodeRegex = /^[a-z][a-z0-9_]*[a-z0-9]$/;


export function validateErrorCodes(codes: Record<string, string>): void {
    const invalidCodes = Object.values(codes).filter(code => errorCodeRegex.test(code) === false);
    if (invalidCodes.length > 0) {
        throw new Error(`Error codes contain invalid format (expected snake_case): ${invalidCodes.join(', ')}`);
    }
}


export function defineErrorCodes<const T extends Record<string, string>>(codes: T): T {
    validateErrorCodes(codes);
    return codes;
}
