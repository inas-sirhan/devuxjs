export type DomainServiceInput = Record<string, unknown>;

export type DomainServiceOutput =
    | { success: true; data?: any }
    | { success: false; errorCode: any };
