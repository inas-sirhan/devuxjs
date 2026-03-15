

import { ValidationErrorCodes } from '@packages/shared-core/zod/validation.error-codes';
import { createZodArray, createZodIsoDateTimeRange, createZodObject, zodRequiredError } from '@packages/shared-core/zod/shared.core.zod.utils';
import * as z from 'zod';


export const zodString = z.string({
    message: ValidationErrorCodes.MustBeString,
    ...zodRequiredError,
});


export const zodNonEmptyString = zodString.min(1, {
    message: ValidationErrorCodes.MustBeNonEmpty,
});



export const zodIsoDateTime = zodNonEmptyString.datetime({
    offset: false, //with timezone
    message: ValidationErrorCodes.InvalidIsoDateTime,
}).refine(isoDateTime => isoDateTime.endsWith('Z'), { //extra defense.
    message: ValidationErrorCodes.MustBeInUTCZ,
});

export const zodIsoDateTimeRange = createZodIsoDateTimeRange(zodIsoDateTime);

export const zodIsoDate = zodNonEmptyString
    .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/)
    .refine((isoDate) => {
        if (isNaN(new Date(isoDate).getTime()) === true) {
            return false;
        }
        const [year, month, day] = isoDate.split('-').map(Number);
        const date = new Date(year, month - 1, day);

        // Check if date rolled over
        return (
            date.getFullYear() === year &&
            date.getMonth() === month - 1 &&
            date.getDate() === day
        );
    }, {
    message: ValidationErrorCodes.InvalidIsoDate,
}); 

export const zodIsoDateRange = createZodIsoDateTimeRange(zodIsoDate);


const MAX_DIGITS_IN_UNIQUE_ID = 10; 
const MAX_ALLOWED_UNIQUE_ID_VALUE = 2_147_483_647;
const UNIQUE_ID_MIN_VALUE = 1;

export function createZodUniqueId(message: string) {
    return z.preprocess((value) => {
        const schema = zodNumericalString.max(MAX_DIGITS_IN_UNIQUE_ID);
        const result = schema.safeParse(value);
        if (result.success === true) {
            const number = parseInt(result.data, 10);
            if (number > MAX_ALLOWED_UNIQUE_ID_VALUE) {
                return null;
            }
            return number;
        }
        return value;
    }, z.number({
        ...zodRequiredError,
        message,
    }).int({
        message,
    }).min(UNIQUE_ID_MIN_VALUE, {
    message,
    }));
}

export const zodBoolean = z.boolean({
    ...zodRequiredError,
    message: ValidationErrorCodes.MustBeBoolean,
});

export const zodCoerceBoolean = z.preprocess((value) => {
    if (typeof value === 'string') {
        if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
            return value.toLowerCase() === 'true';
        }
    }
    return value;
}, zodBoolean);

const zodNumber = z.number({
    message: ValidationErrorCodes.MustBeNumber,
    ...zodRequiredError,
});


export const zodInteger = zodNumber.int({
    message: ValidationErrorCodes.MustBeInteger,
});

export const zodCoerceInteger = z.preprocess((value) => {
    if (typeof value === 'string') {
        if (!/^-?\d+$/.test(value.trim())) {
            return NaN; 
        }
        return parseInt(value, 10);
    }
    return value;
},  zodInteger);

export const zodPositiveInteger = zodInteger.positive({
    message: ValidationErrorCodes.MustBePositive,
});


export const zodNumericalString = zodNonEmptyString.regex(/^\d+$/, {
    message: ValidationErrorCodes.MustBeNumericalString,
});


export const zodNonNegativeInteger = zodInteger.min(0, {
    message: ValidationErrorCodes.MustBeNonNegative,
});

const sharedUploadedFileKeys = {
    fieldname: zodNonEmptyString,
    originalname: zodNonEmptyString,
    encoding: zodNonEmptyString,
    mimetype: zodNonEmptyString,
    size: zodPositiveInteger,
};

const zodMemoryFileUpload = createZodObject({
    ...sharedUploadedFileKeys,
    buffer: z.instanceof(Uint8Array) as z.ZodType<Buffer>,
});

const zodDiskFileUpload = createZodObject({
    ...sharedUploadedFileKeys,
    destination: zodNonEmptyString,
    filename: zodNonEmptyString,
    path: zodNonEmptyString,
});

export type MemoryUploadedFile = z.infer<typeof zodMemoryFileUpload>;
export type DiskUploadedFile = z.infer<typeof zodDiskFileUpload>;

type FileSchemaFor<T extends 'memory' | 'disk'> = T extends 'memory' ? typeof zodMemoryFileUpload : typeof zodDiskFileUpload;

export function withSingleFileUploadZodSchema<
    T extends 'memory' | 'disk',
    S extends z.ZodRawShape,
>(
    storageType: T,
    additionalFields: S
) {
    if ('file' in additionalFields) {
        throw new Error(`withSingleFileUploadZodSchema: 'file' is a reserved key and cannot be used in additionalFields`);
    }

    const fileSchema = storageType === 'memory'
        ? zodMemoryFileUpload
        : zodDiskFileUpload;

    return createZodObject({
        ...additionalFields,
        file: fileSchema,
    }) as ReturnType<typeof createZodObject<{ file: FileSchemaFor<T> } & S>>;
}


export function withArrayFileUploadZodSchema<
    T extends 'memory' | 'disk',
    S extends z.ZodRawShape,
>(
    storageType: T,
    additionalFields: S
) {
    if ('files' in additionalFields) {
        throw new Error(`withArrayFileUploadZodSchema: 'files' is a reserved key and cannot be used in additionalFields`);
    }

    const fileSchema = storageType === 'memory'
        ? zodMemoryFileUpload
        : zodDiskFileUpload;

    return createZodObject({
        ...additionalFields,
        files: createZodArray(fileSchema),
    }) as ReturnType<typeof createZodObject<{ files: z.ZodArray<FileSchemaFor<T>> } & S>>;
}

type FieldsFilesShape<TFields extends readonly string[], TFileSchema extends z.ZodObject<z.ZodRawShape, 'strict'>> = {
    [K in TFields[number]]: z.ZodArray<TFileSchema>
};

export function withFieldsFileUploadZodSchema<
    T extends 'memory' | 'disk',
    const TFields extends readonly string[],
    S extends z.ZodRawShape,
>(
    storageType: T,
    fields: TFields,
    additionalFields: S
) {
    if ('files' in additionalFields) {
        throw new Error(`withFieldsFileUploadZodSchema: 'files' is a reserved key and cannot be used in additionalFields`);
    }

    for (const fieldName of fields) {
        if (fieldName in additionalFields) {
            throw new Error(`withFieldsFileUploadZodSchema: field name '${fieldName}' conflicts with a key in additionalFields`);
        }
    }

    const fileSchema = storageType === 'memory'
        ? zodMemoryFileUpload
        : zodDiskFileUpload;

    const filesShape = Object.fromEntries(
        fields.map(name => [name, createZodArray(fileSchema)])
    );

    return createZodObject({
        ...additionalFields,
        files: createZodObject(filesShape),
    }) as ReturnType<typeof createZodObject<{ files: z.ZodObject<FieldsFilesShape<TFields, FileSchemaFor<T>>, 'strict'> } & S>>;
}
