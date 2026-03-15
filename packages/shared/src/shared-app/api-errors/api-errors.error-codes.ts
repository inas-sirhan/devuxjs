import { CoreApiErrorCodes } from '@packages/shared-core/api-errors/core.api-error-codes';

export const ApiErrorCodes = {
	...CoreApiErrorCodes,

	// Authentication
	NotAuthenticated: 'not_authenticated',

	// Authorization
	NotAuthorized: 'not_authorized',
} as const;
