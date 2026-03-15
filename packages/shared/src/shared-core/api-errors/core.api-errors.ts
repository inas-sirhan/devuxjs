import { defineApiError } from '@packages/shared-core/utils/define-api-error';
import { createZodObject } from '@packages/shared-core/zod/shared.core.zod.utils';
import { CoreApiErrorCodes } from '@packages/shared-core/api-errors/core.api-error-codes';
import * as z from 'zod';


export const FileUploadErrors = {

	FileUploadExceededPartCount: defineApiError({
		statusCode: 400,
		errorType: 'file_upload',
		errorCode: CoreApiErrorCodes['FileUploadExceededPartCount'],
	}),

	FileUploadExceededMaxFileSize: defineApiError({
		statusCode: 413,
		errorType: 'file_upload',
		errorCode: CoreApiErrorCodes['FileUploadExceededMaxFileSize'],
	}),

	FileUploadExceededMaxFilesCount: defineApiError({
		statusCode: 400,
		errorType: 'file_upload',
		errorCode: CoreApiErrorCodes['FileUploadExceededMaxFilesCount'],
	}),

	FileUploadExceededFieldNameMaxSize: defineApiError({
		statusCode: 400,
		errorType: 'file_upload',
		errorCode: CoreApiErrorCodes['FileUploadExceededFieldNameMaxSize'],
	}),

	FileUploadExceededFieldValueMaxSize: defineApiError({
		statusCode: 400,
		errorType: 'file_upload',
		errorCode: CoreApiErrorCodes['FileUploadExceededFieldValueMaxSize'],
	}),

	FileUploadExceededMaxFieldsCount: defineApiError({
		statusCode: 400,
		errorType: 'file_upload',
		errorCode: CoreApiErrorCodes['FileUploadExceededMaxFieldsCount'],
	}),

	FileUploadUnexpectedFile: defineApiError({
		statusCode: 400,
		errorType: 'file_upload',
		errorCode: CoreApiErrorCodes['FileUploadUnexpectedFile'],
	}),

	FileUploadInvalidFileType: defineApiError({
		statusCode: 415,
		errorType: 'file_upload',
		errorCode: CoreApiErrorCodes['FileUploadInvalidFileType'],
	}),

} as const;


export const CoreApiErrors = {
	/* VALIDATION */
	ValidationError: defineApiError({
		statusCode: 422,
		errorType: 'validation',
		errorCode: CoreApiErrorCodes['ValidationError'],
		extraSchema: {
			validationErrors: z.array(
				createZodObject({
					errorCode: z.string(),
					path: z.string(),
				}),
			),
		},
	}),

	/* FILE UPLOAD ERRORS */
	...FileUploadErrors,


	/* UNEXPECTED ERROR */
	UnexpectedError: defineApiError({
		statusCode: 500,
		errorType: 'unexpected',
		errorCode: CoreApiErrorCodes['UnexpectedError'],
	}),

} as const;

