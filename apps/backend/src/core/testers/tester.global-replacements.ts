import { type Newable } from 'inversify';
import { kebabToPascalCase } from '@/core/cli/utils/case-converter';
import type { BindingEntry } from '@/core/testers/testers.types';


export abstract class TesterGlobalReplacements {
    private static bindings = new Map<symbol, BindingEntry<unknown>>();

    public static replace<T>(keyOrToken: symbol | string) {
        const token = typeof keyOrToken === 'symbol'
            ? keyOrToken
            : Symbol.for(kebabToPascalCase(keyOrToken));

        return {
            withClass: (impl: Newable<T>) => {
                this.bindings.set(token, { type: 'singleton', impl });
            },
            withValue: (value: T) => {
                this.bindings.set(token, { type: 'value', value });
            },
        };
    }

    public static getBindings() {
        return this.bindings;
    }
}

