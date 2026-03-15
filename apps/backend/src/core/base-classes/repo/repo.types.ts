


export type UniqueKeyViolationErrorMap<T> = { [k: string]: T };
export type ForeignKeyViolationErrorMap<T> = { [k: string]: T };

export type RepoInput = Record<string, unknown>;

export type RepoOutput = {
    success: true,
    data?: any,
} | {
    success: false,
    errorCode: any,
};

