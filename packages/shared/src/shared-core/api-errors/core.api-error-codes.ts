export const CoreApiErrorCodes = {
	// Validation
	ValidationError: 'validation_error',

	// File Upload
	FileUploadExceededPartCount: 'exceeded_part_count',
	FileUploadExceededMaxFileSize: 'exceeded_max_file_size',
	FileUploadExceededMaxFilesCount: 'exceeded_max_files_count',
	FileUploadExceededFieldNameMaxSize: 'exceeded_field_name_max_size',
	FileUploadExceededFieldValueMaxSize: 'exceeded_field_value_max_size',
	FileUploadExceededMaxFieldsCount: 'exceeded_max_fields_count',
	FileUploadUnexpectedFile: 'unexpected_file',
	FileUploadInvalidFileType: 'invalid_file_type',

	// Unexpected
	UnexpectedError: 'unexpected_error',
} as const;
