import { assertNeverReached } from '@/core/utils/core.utils';
import type { FieldsDiskFieldConfig, FieldsFileUploadOptions, FileUploadOptions } from '@/core/utils/setup-endpoint.core.utils';
import { coreConfig } from '@/infrastructure/core/core.config';
import { ApiErrors } from '@packages/shared-app/api-errors/api-errors';
import type { NextFunction, Request, Response, RequestHandler } from 'express';
import multer, { MulterError } from 'multer';



type CreateMulterUploadConfig = {
    fileUploadConfig: FileUploadOptions;
    maxFields: number;
};

export function createMulterUpload({ fileUploadConfig, maxFields }: CreateMulterUploadConfig): RequestHandler {
    const maxFiles = fileUploadConfig.mode === 'single'
        ? 1
        : fileUploadConfig.mode === 'array'
            ? fileUploadConfig.maxCount
            : fileUploadConfig.fields.reduce((sum, f) => sum + f.maxCount, 0);

    const maxParts = maxFields + maxFiles;

    let storage: multer.StorageEngine;
    if (fileUploadConfig.storageType === 'memory') {
        storage = multer.memoryStorage();
    } 
    else {
        if (fileUploadConfig.mode === 'fields') {
            const fieldsConfig = fileUploadConfig as FieldsFileUploadOptions & { storageType: 'disk'; fields: FieldsDiskFieldConfig[] };
            const fieldConfigMap = new Map(fieldsConfig.fields.map(f => [f.name, f]));

            storage = multer.diskStorage({
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                destination: async (req, file, cb) => {
                    try {
                        const fieldConfig = fieldConfigMap.get(file.fieldname)!;
                        const dest = typeof fieldConfig.destination === 'function'
                            ? await fieldConfig.destination(req as any, file)
                            : fieldConfig.destination;
                        cb(null, dest);
                    }
                    catch (error) {
                        cb(error as Error, '');
                    }
                },
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                filename: async (req, file, cb) => {
                    try {
                        const fieldConfig = fieldConfigMap.get(file.fieldname)!;
                        const filename = await fieldConfig.generateFilename(req as any, file);
                        cb(null, filename);
                    }
                    catch (error) {
                        cb(error as Error, '');
                    }
                },
            });
        }
        else {
            storage = multer.diskStorage({
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                destination: async (req, file, cb) => {
                    try {
                        const dest = typeof fileUploadConfig.destination === 'function'
                            ? await fileUploadConfig.destination(req as any, file)
                            : fileUploadConfig.destination;
                        cb(null, dest);
                    }
                    catch (error) {
                        cb(error as Error, '');
                    }
                },
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                filename: async (req, file, cb) => {
                    try {
                        const filename = await fileUploadConfig.generateFilename(req as any, file);
                        cb(null, filename);
                    }
                    catch (error) {
                        cb(error as Error, '');
                    }
                },
            });
        }
    } 

    const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
        let allowedMimeTypes: string[];

        if (fileUploadConfig.mode === 'fields') {
            const fieldConfig = fileUploadConfig.fields.find(f => f.name === file.fieldname);
            if (fieldConfig === undefined) {
                cb(ApiErrors['FileUploadInvalidFileType'].create());
                return;
            }
            allowedMimeTypes = fieldConfig.allowedMimeTypes;
        }
        else {
            allowedMimeTypes = fileUploadConfig.allowedMimeTypes;
        }

        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(ApiErrors['FileUploadInvalidFileType'].create());
        }
    };

    const upload = multer({
        storage,
        preservePath: false,
        limits: {
            fileSize: fileUploadConfig.maxFileSizeBytes,
            files: maxFiles,
            fields: maxFields,
            parts: maxParts,
            headerPairs: maxParts * 5,
            fieldSize: fileUploadConfig.maxFieldValueSizeBytes ?? coreConfig.fileUpload.maxFieldValueSizeBytes,
            fieldNameSize: fileUploadConfig.maxFieldNameSizeBytes ?? coreConfig.fileUpload.maxFieldNameSizeBytes,
        },
        fileFilter,
    });

    if (fileUploadConfig.mode === 'single') {
        return upload.single('file');
    } 
    else {
        if (fileUploadConfig.mode === 'array') {
            return upload.array('files', fileUploadConfig.maxCount);
        }
        else {
            const multerFields = fileUploadConfig.fields.map(f => ({ name: f.name, maxCount: f.maxCount }));
            return upload.fields(multerFields);
        }
    }
}



export function multerErrorsHandler(error: unknown, _req: Request, _res: Response, next: NextFunction): void {

    if (error instanceof MulterError === false) {
        next(error);
        return;
    }

    const multerErrorCode = error.code;

    if (multerErrorCode === 'LIMIT_PART_COUNT') {
        return ApiErrors['FileUploadExceededPartCount'].throw();
    }
    if (multerErrorCode === 'LIMIT_FILE_SIZE') {
        return ApiErrors['FileUploadExceededMaxFileSize'].throw();
    }
    if (multerErrorCode === 'LIMIT_FILE_COUNT') {
        return ApiErrors['FileUploadExceededMaxFilesCount'].throw();
    }
    if (multerErrorCode === 'LIMIT_FIELD_KEY') {
        return ApiErrors['FileUploadExceededFieldNameMaxSize'].throw();
    }
    if (multerErrorCode === 'LIMIT_FIELD_VALUE') {
        return ApiErrors['FileUploadExceededFieldValueMaxSize'].throw();
    }
    if (multerErrorCode === 'LIMIT_FIELD_COUNT') {
        return ApiErrors['FileUploadExceededMaxFieldsCount'].throw();
    }
    if (multerErrorCode === 'LIMIT_UNEXPECTED_FILE') {
        return ApiErrors['FileUploadUnexpectedFile'].throw();
    }
    if (multerErrorCode === 'MISSING_FIELD_NAME') {
        return ApiErrors['UnexpectedError'].throw();
    }

    assertNeverReached(multerErrorCode);
}


export function moveFileToBody(req: Request, _res: Response, next: NextFunction): void {
    req.body.file = req.file;
    next();
}


export function moveFilesToBody(req: Request, _res: Response, next: NextFunction): void {
    req.body.files = req.files;
    next();
}

