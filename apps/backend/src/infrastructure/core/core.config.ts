import '@/core/utils/load-env';
import type { CoreConfig } from '@/core/types/core.types';


const isDevelopment = process.env.NODE_ENV === 'development';
const isTesting = process.env.NODE_ENV === 'test';
const isProduction = process.env.NODE_ENV === 'production';

export const coreConfig: CoreConfig = {

    transactionMaxAttempts: 5,
    baseDelayBetweenTransactionRetriesMillis: 50,
    
    repoDurationThresholdMillis: 50,
    domainServiceDurationThresholdMillis: 100,
    useCaseDurationThresholdMillis: 200,



    jsonBodyParser: {
        maxBodySizeBytes: 200 * 1024,  
    },

    queryParamsParser: {
        parameterLimit: 50,
        depthLimit: 5,
        arrayLimit: 10,
    },

    fileUpload: {
        maxFieldValueSizeBytes: 1024,   
        maxFieldNameSizeBytes: 100,     
    },

    isDevelopment,
    isTesting,
    isProduction,

    syncApi: process.env.SYNC_API === 'true',

    // Use z.ZodType<T> for strict mode (no mutations)
    assertNoMutationsInInternalSchemas: false, 

    generator: {
        routeConfig: {
            generateMiddlewares: false,
            generateSummary: false,
            generateDescription: false,
            generateExtraTags: false,
        },
        responses: {
            generateDescription: false,
        },
        repo: {
            generateUniqueKeyViolationErrorMap: true,
            generateForeignKeyViolationErrorMap: true,
        },
    },

};