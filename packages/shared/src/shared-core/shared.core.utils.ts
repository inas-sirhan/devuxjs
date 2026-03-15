import type { ExcludeUndefined, ExcludeUndefinedDeep } from './shared.core.types';

export function stripUndefined<T>(value: T): ExcludeUndefined<T> {
    if (value === null || value === undefined || typeof value !== 'object') {
        return value as ExcludeUndefined<T>;
    }
    if (Array.isArray(value)) {
        return value as ExcludeUndefined<T>;
    }
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
        if (val !== undefined) {
            result[key] = val;
        }
    }
    return result as ExcludeUndefined<T>;
}

export function stripUndefinedDeep<T>(value: T): ExcludeUndefinedDeep<T> {
    if (value === null || value === undefined || typeof value !== 'object') {
        return value as ExcludeUndefinedDeep<T>;
    }
    if (Array.isArray(value)) {
        return value.map(stripUndefinedDeep) as ExcludeUndefinedDeep<T>;
    }
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
        if (val !== undefined) {
            result[key] = stripUndefinedDeep(val);
        }
    }
    return result as ExcludeUndefinedDeep<T>;
}
