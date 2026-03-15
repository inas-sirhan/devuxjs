import type { DestinationFn, FieldsDiskFieldConfig, FieldsMemoryFieldConfig, FilenameFn } from '@/core/utils/setup-endpoint.core.utils';
import type { DiskUploadedFile, MemoryUploadedFile } from '@packages/shared-core/zod/shared.core.zod.field-validators';
import type * as z from 'zod';

type FilesShape = Record<string, z.ZodArray<z.ZodType<DiskUploadedFile>> | z.ZodArray<z.ZodType<MemoryUploadedFile>>>;

type BaseFileUploadSchema = z.ZodObject<z.ZodRawShape & { files: z.ZodObject<FilesShape, 'strict'> }, 'strict'>;

type FileUploadSchemaWithEffects =
    | BaseFileUploadSchema
    | z.ZodEffects<FileUploadSchemaWithEffects, unknown, unknown>;


type MemoryFieldConfig = {
    maxCount: number;
    allowedMimeTypes: string[];
};

type DiskFieldConfig = {
    maxCount: number;
    allowedMimeTypes: string[];
    destination: string | DestinationFn;
    generateFilename: FilenameFn;
};

type InferStorageType<TRequest> =
    TRequest extends { files: Record<string, { buffer: unknown }[]> }
        ? 'memory'
        : TRequest extends { files: Record<string, { path: unknown }[]> }
            ? 'disk'
            : never;

type FieldConfigFor<TStorageType extends 'memory' | 'disk'> =
    TStorageType extends 'memory' ? MemoryFieldConfig : DiskFieldConfig;

type FieldsInput<TRequest> = TRequest extends { files: infer F }
    ? F extends Record<string, unknown>
        ? { [K in keyof F & string]: FieldConfigFor<InferStorageType<TRequest>> }
        : never
    : never;

type ConfigInput<TRequest> = {
    maxFileSizeBytes: number;
    maxFieldValueSizeBytes?: number;
    maxFieldNameSizeBytes?: number;
    fields: FieldsInput<TRequest>;
};

type ReturnTypeFor<TStorageType extends 'memory' | 'disk'> =
    TStorageType extends 'memory'
        ? { mode: 'fields'; storageType: 'memory'; maxFileSizeBytes: number; maxFieldValueSizeBytes?: number; maxFieldNameSizeBytes?: number; fields: FieldsMemoryFieldConfig[] }
        : { mode: 'fields'; storageType: 'disk'; maxFileSizeBytes: number; maxFieldValueSizeBytes?: number; maxFieldNameSizeBytes?: number; fields: FieldsDiskFieldConfig[] };


export function defineFieldsUploadConfig<
    TSchema extends FileUploadSchemaWithEffects
>(
    _schema: TSchema,
    config: ConfigInput<z.infer<TSchema>>
): ReturnTypeFor<InferStorageType<z.infer<TSchema>>> {
    const { fields: fieldsInput, ...options } = config;

    const firstFieldConfig = Object.values(fieldsInput)[0] as Record<string, unknown> | undefined;
    const storageType = firstFieldConfig !== undefined && 'destination' in firstFieldConfig ? 'disk' : 'memory';

    const fields = Object.entries(fieldsInput).map(([name, fieldConfig]) => ({
        name,
        ...(fieldConfig as Record<string, unknown>),
    }));

    return { mode: 'fields', storageType, fields, ...options } as ReturnTypeFor<InferStorageType<z.infer<TSchema>>>;
}
