

import type { RequestContainer } from '@/core/containers/request-container';
import type { ResponseShape } from '@/core/types/core.types';

declare global {
    namespace Express {
        interface Request {
            endpointId: string;  
            requestContainer: RequestContainer;
            query: never;
            parsedQuery: Record<string, any>;
        }
        interface Locals {
            presenterResponse: ResponseShape;
        }
    }
}

