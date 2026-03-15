import { inject } from 'inversify';
import { kebabToPascalCase } from '@/core/cli/utils/case-converter';


export const loweredTokensRegistry = new Set<string>();

const keyFormat = /^[A-Z][a-zA-Z0-9]+$/;

export function defineDiToken<T extends string>(key: T) {
    if (keyFormat.test(key) === false) {
        throw new Error(`Invalid token key "${key}". Token keys must start with an uppercase letter and contain only letters and numbers.`);
    }

    const loweredKey = key.toLowerCase();
    if (loweredTokensRegistry.has(loweredKey) === true) {
        throw new Error(`This key (${key}) has already been used before!! Seems like you mistakenly reused a key (copy/paste or w/e..)`);
    }

    loweredTokensRegistry.add(loweredKey);

    return Symbol.for(key);
}


export function createInjectFn(token: symbol) {
    return () => inject(token);
}


export function getDiTokenOfKey(key: string): symbol {
    return Symbol.for(kebabToPascalCase(key));
}

export function getKeyOfDiToken(token: symbol): string {
    const key = Symbol.keyFor(token);
    if (key === undefined) {
        throw new Error(`Symbol is not registered in the global symbol registry`);
    }
    return key;
}

