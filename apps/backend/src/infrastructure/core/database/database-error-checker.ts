import type { CheckDatabaseErrorResult } from '@/core/types/core.types';


export function checkDatabaseError(error: unknown): CheckDatabaseErrorResult {
    if (typeof error === 'object' && error !== null && 'code' in error) {
        if (error.code === '23505') {  
            return { 
                type: 'unique', 
                constraint: (error as any).constraint
            };
        }

        if (error.code === '23503') {  
            return { 
                type: 'foreign',
                constraint: (error as any).constraint
            };
        }
        
        if (error.code === '40001') {  
            return { 
                type: 'serialization'
            };
        }

        if (error.code === '40P01') {  
            return { 
                type: 'deadlock'
            };
        }
    }
    
    return { 
        type: 'other'
    };
}

