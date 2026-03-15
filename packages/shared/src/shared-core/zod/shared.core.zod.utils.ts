import { ValidationErrorCodes } from '@packages/shared-core/zod/validation.error-codes';
import type { ArrayedPath, ExcludeUndefined, ValueOf } from '@packages/shared-core/shared.core.types';
import * as z from 'zod';


export const zodRequiredError = {
    required_error: ValidationErrorCodes.Required,
};


export function createZodEnum<
    T extends Record<string, string>
>(
    enumLikeObject: T,
    message: string,
) {
    const values = Object.values(enumLikeObject) as [ValueOf<T>, ...ValueOf<T>[]];
    return z.enum(values, {
        ...zodRequiredError,
        message,
    });
}

export function createZodIsoDateTimeRange(
    schema: z.ZodString | z.ZodEffects<z.ZodString> | z.ZodEffects<z.ZodEffects<z.ZodString>>,
) {
    return createZodObject({
        from: schema,
        to: schema,
    }).superRefine((dateRange, ctx) => {
        if (!(new Date(dateRange.from) <= new Date(dateRange.to))) {
            ctx.addIssue({
                message: ValidationErrorCodes.InvalidIsoDateTimeRange,
                path: ['to'] satisfies ArrayedPath<typeof dateRange>,
                code: z.ZodIssueCode.custom,
            });
        } 
    });
}


export function zodStrictPick<
    T extends z.ZodObject<z.ZodRawShape, 'strict'>,
    K extends Partial<Record<keyof T['shape'], true>>,
>(
    schema: T,
    keys: K & Record<Exclude<keyof K, keyof T['shape']>, never>,
) {
    const shape = schema.shape;
    const pickedShape = {} as Record<string, unknown>;
    const shapeKeys = new Set(Object.keys(shape));

    for (const key of Object.keys(keys)) {
        if (shapeKeys.has(key) === true && keys[key] === true) {
            pickedShape[key] = shape[key];
        }
        else {
            throw new Error(`[zodStrictPick] Key "${key}" does not exist in schema shape or its value is not true`);
        }
    }

    type TrueKeysOnly = Pick<T['shape'], {
        [P in keyof K]: K[P] extends true ? P : never;
    }[Extract<keyof K, string>]>;

    return createZodObject(pickedShape as TrueKeysOnly);
}

export function zodShapePick<
    T extends z.ZodObject<z.ZodRawShape, 'strict'>,
    K extends Partial<Record<keyof T['shape'], true>>,
>(
    schema: T,
    keys: K & Record<Exclude<keyof K, keyof T['shape']>, never>,
) {
    const shape = schema.shape;
    const pickedShape = {} as Record<string, unknown>;
    const shapeKeys = new Set(Object.keys(shape));

    for (const key of Object.keys(keys)) {
        if (shapeKeys.has(key) === true && keys[key] === true) {
            pickedShape[key] = shape[key];
        }
        else {
            throw new Error(`[zodShapePick] Key "${key}" does not exist in schema shape or its value is not true`);
        }
    }

    type TrueKeysOnly = Pick<T['shape'], {
        [P in keyof K]: K[P] extends true ? P : never;
    }[Extract<keyof K, string>]>;

    return pickedShape as TrueKeysOnly;
}

export function zodStrictOmit<
    T extends z.ZodObject<z.ZodRawShape, 'strict'>,
    K extends Partial<Record<keyof T['shape'], true>>,
>(
    schema: T,
    keys: K & Record<Exclude<keyof K, keyof T['shape']>, never>,
) {
    const shape = schema.shape;
    const newShape = {} as Record<string, unknown>;
    const shapeKeys = new Set(Object.keys(shape));
    const keysSetOfKeys = new Set(Object.keys(keys));


    for (const key of keysSetOfKeys) {
        if (shapeKeys.has(key) === true && keys[key] === true) {
            //no-op
        } 
        else {
            throw new Error(`[zodStrictOmit] Key "${key}" does not exist in schema shape or value is not true`);
        }
    }

    for (const key of shapeKeys) {
        if (keysSetOfKeys.has(key) === false) {
            newShape[key] = shape[key];
        }
    }

    type RemainingKeysOnly = Pick<T['shape'], Exclude<keyof T['shape'], {
        [P in keyof K]: K[P] extends true ? P : never;
    }[Extract<keyof K, string>]>>;

    return createZodObject(newShape as RemainingKeysOnly);
}

export function zodStrictReplace<
    T extends z.ZodObject<z.ZodRawShape, 'strict'>,
    R extends { [K in keyof T['shape']]?: z.ZodTypeAny },
>(
    schema: T,
    replacements: R & Record<Exclude<keyof R, keyof T['shape']>, never>,
) {
    const shape = schema.shape;
    const newShape = {} as Record<string, unknown>;
    const replacementKeys = new Set(Object.keys(replacements));

    for (const key of replacementKeys) {
        if ((key in shape) === false) {
            throw new Error(`[zodStrictReplace] Key "${key}" does not exist in schema shape`);
        }
    }

    for (const key of Object.keys(shape)) {
        if (replacementKeys.has(key) === true) {
            newShape[key] = replacements[key as keyof R];
        }
        else {
            newShape[key] = shape[key];
        }
    }

    type ReplacedShape = {
        [K in keyof T['shape']]: K extends keyof R
            ? R[K] extends z.ZodTypeAny ? R[K] : T['shape'][K]
            : T['shape'][K]
    };

    return createZodObject(newShape as ReplacedShape);
}

export function zodStrictPickAndReplace<
    T extends z.ZodObject<z.ZodRawShape, 'strict'>,
    P extends { [K in keyof T['shape']]?: true | z.ZodTypeAny },
>(
    schema: T,
    picks: P & Record<Exclude<keyof P, keyof T['shape']>, never>,
) {
    const shape = schema.shape;
    const newShape = {} as Record<string, unknown>;
    const shapeKeys = new Set(Object.keys(shape));

    for (const key of Object.keys(picks)) {
        if (shapeKeys.has(key) === false) {
            throw new Error(`[zodStrictPickAndReplace] Key "${key}" does not exist in schema shape`);
        }
        const value = picks[key as keyof P];
        if (value === true) {
            newShape[key] = shape[key];
        }
        else {
            newShape[key] = value;
        }
    }

    type PickedAndReplacedShape = {
        [K in keyof P & keyof T['shape']]: P[K] extends true
            ? T['shape'][K]
            : P[K] extends z.ZodTypeAny
                ? P[K]
                : never
    };

    return createZodObject(newShape as PickedAndReplacedShape);
}


export function createZodObject<T extends z.ZodRawShape>(
    shape: T,
) {
    return z.object(shape, {
        message: ValidationErrorCodes.MustBeObject,
        ...zodRequiredError,
    }).strict({
        message: ValidationErrorCodes.InvalidKeysDetected,
    });
}


export function createZodNonEmptyObject<T extends z.ZodRawShape>(
    shape: T,
) {
    const schema = createZodObject(shape).refine(data => Object.keys(data).length > 0, {
        message: ValidationErrorCodes.MustBeNonEmpty
    });
    return applyZodCleanUndefined(schema);
    
}


export function applyZodCleanUndefined<T extends z.ZodTypeAny>(schema: T) {
    type Input = z.infer<typeof schema>;
    type Output = ExcludeUndefined<Input>;
    return schema.transform((data): Output => {
        return data as Output;
    });
}


export function createZodArray<T extends z.ZodTypeAny>(
    zodValidatorCell: T,
) {
    return z.array(zodValidatorCell, {
        message: ValidationErrorCodes.MustBeArray,
        ...zodRequiredError
    });
}

export function createZodNonEmptyArray<T extends z.ZodTypeAny>(
    zodValidatorCell: T,
) {
    return createZodArray(zodValidatorCell).min(1, {
        message: ValidationErrorCodes.MustBeNonEmpty
    });
}

const boundaryErrorCodesMap:
    Record<Boundary, {
        number: string;
        string: string;
        array: string;
    }> = {
        min: {
            number: ValidationErrorCodes.TooSmall,
            string: ValidationErrorCodes.TooShort,
            array: ValidationErrorCodes.TooFewElements
        },
        max: {
            number: ValidationErrorCodes.TooBig,
            string: ValidationErrorCodes.TooLong,
            array: ValidationErrorCodes.TooManyElements
        }
    };

type Boundary = 'min' | 'max';
type Boundaries = Partial<Record<Boundary, number>>;

type ZodWithBoundaries = 
    | z.ZodNumber 
    | z.ZodString | z.ZodEffects<z.ZodString>
    | z.ZodArray<z.ZodTypeAny, z.ArrayCardinality>;

type ZodWithBoundariesType = 
    | 'number'
    | 'string'
    | 'array';

type CmpFunc = (val1: number, val2: number) => boolean;
const isSmaller: CmpFunc = (val1, val2) => val1 < val2;
const isBigger:  CmpFunc = (val1, val2) => val1 > val2;

const genericCompare = (
    toCompare: number,
    compareTo: number | undefined,
    cmpFunc: CmpFunc,
    key: Boundary,
    schemaType: ZodWithBoundariesType,
    ctx: z.RefinementCtx,
) => {
    if (compareTo === undefined) {
        return;
    }
    if (cmpFunc(toCompare, compareTo)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: boundaryErrorCodesMap[key][schemaType],
            params: {
                [key]: compareTo,
            },
        });
    }
};

export function applyZodBoundaries<T extends ZodWithBoundaries>(schema: T, boundaries: Boundaries) {
    const { min, max } = boundaries;

    const applyMinAndMaxBoundaries = (
        toCompare: number,
        schemaType: ZodWithBoundariesType,
        ctx: z.RefinementCtx,
    ) => {
        genericCompare(toCompare, min, isSmaller, 'min', schemaType, ctx);
        genericCompare(toCompare, max, isBigger,  'max', schemaType, ctx);
    };

    if (schema instanceof z.ZodNumber) {
        return schema.superRefine((val, ctx) => {
            applyMinAndMaxBoundaries(val, 'number', ctx);
        }) as z.ZodEffects<T>;
    }
    if (schema instanceof z.ZodString || 
        schema instanceof z.ZodEffects && schema._def.schema instanceof z.ZodString
    ) {
        return schema.superRefine((val, ctx) => {
            applyMinAndMaxBoundaries(val.length, 'string', ctx);
        })  as z.ZodEffects<T>;
    }
    if (schema instanceof z.ZodArray) {
        return schema.superRefine((val, ctx) => {
            applyMinAndMaxBoundaries(val.length, 'array', ctx);
        }) as z.ZodEffects<T>;
    }
    throw new Error("unsupported zod schema type");
}

type BoundariesOptions = Partial<{ min: number; max: number }>;

export function applyZodBoundariesV2(schema: z.ZodString, boundaries: BoundariesOptions): z.ZodString;
export function applyZodBoundariesV2(schema: z.ZodNumber, boundaries: BoundariesOptions): z.ZodNumber;
export function applyZodBoundariesV2<T extends z.ZodTypeAny>(schema: z.ZodArray<T>, boundaries: BoundariesOptions): z.ZodArray<T>;
export function applyZodBoundariesV2(
    schema: z.ZodString | z.ZodNumber | z.ZodArray<z.ZodTypeAny>,
    boundaries: BoundariesOptions
) {
    const { min, max } = boundaries;

    const getMinError = () => {
        if (schema instanceof z.ZodString) {
            return ValidationErrorCodes.TooShort;
        }
        if (schema instanceof z.ZodNumber) {
            return ValidationErrorCodes.TooSmall;
        }
        if (schema instanceof z.ZodArray) {
            return ValidationErrorCodes.TooFewElements;
        }
        throw new Error('Unexpected schema type in applyZodBoundariesV2');
    };

    const getMaxError = () => {
        if (schema instanceof z.ZodString) {
            return ValidationErrorCodes.TooLong;
        }
        if (schema instanceof z.ZodNumber) {
            return ValidationErrorCodes.TooBig;
        }
        if (schema instanceof z.ZodArray) {
            return ValidationErrorCodes.TooManyElements;
        }
        throw new Error('Unexpected schema type in applyZodBoundariesV2');
    };

    let result = schema;
    if (min !== undefined) {
        result = result.min(min, getMinError());
    }
    if (max !== undefined) {
        result = result.max(max, getMaxError());
    }
    return result;
}

