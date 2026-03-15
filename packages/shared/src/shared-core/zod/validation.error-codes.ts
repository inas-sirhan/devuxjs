import { defineErrorCodes } from '@packages/shared-core/utils/define-error-codes';

export const ValidationErrorCodes = defineErrorCodes({
    Required: 'required_field',
    MustBeNonEmpty: 'must_be_non_empty',
    MustBeObject: 'must_be_object',
    MustBeArray: 'must_be_array',
    MustBeString: 'must_be_string',
    MustBeNumber: 'must_be_number',
    MustBeInteger: 'must_be_integer',
    MustBePositive: 'must_be_positive',
    MustBeNonNegative: 'must_be_non_negative',
    MustBeNumericalString: 'must_be_numerical_string',
    MustBeBoolean: 'must_be_boolean',

    InvalidIsoDateTime: 'invalid_iso_date_time',
    InvalidIsoDateTimeRange: 'invalid_iso_date_time_range',
    InvalidIsoDate: 'invalid_iso_date',
    MustBeInUTCZ: 'must_be_in_utc_z',

    InvalidEmail: 'invalid_email',
    InvalidKeysDetected: 'invalid_keys_detected',
    TooSmall: 'too_small',
    TooBig: 'too_big',
    TooShort: 'too_short',
    TooLong: 'too_long',
    TooFewElements: 'too_few_elements',
    TooManyElements: 'too_many_elements',
    
});


