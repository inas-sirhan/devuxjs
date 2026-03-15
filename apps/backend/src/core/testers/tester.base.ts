import type { Container, Newable } from 'inversify';
import { TesterGlobalReplacements } from '@/core/testers/tester.global-replacements';
import { RequestContextDiToken } from '@/core/core-injectables/request-context/request-context.inversify.tokens';
import { createMockRequestContext } from '@/core/testers/mocks/request-context.mock';
import { getDiTokenOfKey, getKeyOfDiToken } from '@/core/utils/di-tokens.core.utils';
import { pascalToKebabCase } from '@/core/cli/utils/case-converter';
import type { BindingEntry } from '@/core/testers/testers.types';
import { coreConfig } from '@/infrastructure/core/core.config';


export abstract class TesterBase<TDeps extends Record<string, unknown>> {
    protected readonly bindingsMap = new Map<keyof TDeps, BindingEntry<TDeps[keyof TDeps]>>();
    protected ignoreGlobals = false;
    protected lastContainer: Container | null = null;

    public constructor(
        private readonly validDeps: ReadonlySet<string>,
    ) {
        if (coreConfig.isTesting === false) {
            throw new Error('Testers can only be used in test environment (NODE_ENV=test)');
        }
    }

    public setIgnoreGlobals(ignore: boolean): void {
        this.ignoreGlobals = ignore;
    }

    public replace<K extends keyof TDeps>(key: K) {
        const keyStr = key as string;
        if (this.validDeps.has(keyStr) === false) {
            throw new Error(`'${keyStr}' is not a dependency of this tester. Valid deps: ${[...this.validDeps].join(', ')}`);
        }

        this.lastContainer = null; 
        return {
            withClass: (impl: Newable<TDeps[K]>) => {
                this.lastContainer = null;
                this.bindingsMap.set(key, { type: 'singleton', impl });
            },
            withValue: (value: TDeps[K]) => {
                this.lastContainer = null; 
                this.bindingsMap.set(key, { type: 'value', value });
            },
        };
    }

    public replaceIfDepends(keyOrToken: string | symbol) {
        const kebabKey = typeof keyOrToken === 'symbol'
            ? pascalToKebabCase(getKeyOfDiToken(keyOrToken))
            : keyOrToken;

        const isValidDep = this.validDeps.has(kebabKey);

        this.lastContainer = null; 
        return {
            withClass: (impl: Newable<unknown>) => {
                if (isValidDep === false) {
                    return;
                }
                this.lastContainer = null;
                this.bindingsMap.set(kebabKey as keyof TDeps, { type: 'singleton', impl: impl as any } );
            },
            withValue: (value: unknown) => {
                if (isValidDep === false) {
                    return;
                } 
                this.lastContainer = null;
                this.bindingsMap.set(kebabKey as keyof TDeps, { type: 'value', value: value as any });
            },
        };
    }

    public clearReplacement<K extends keyof TDeps>(key: K): void {
        this.lastContainer = null; 
        this.bindingsMap.delete(key);
    }

    public clearAllReplacements(): void {
        this.lastContainer = null; 
        this.bindingsMap.clear();
    }

    public get<K extends keyof TDeps>(key: K): TDeps[K] {
        if (this.lastContainer === null) {
            throw new Error('Cannot call get() before execute/createService (container is null)');
        }
        const token = getDiTokenOfKey(key as string);
        return this.lastContainer.get<TDeps[K]>(token);
    }

    protected applyReplacements(container: Container): void {
        const requestContextKey = pascalToKebabCase(getKeyOfDiToken(RequestContextDiToken));
        if (this.validDeps.has(requestContextKey) === true) {
            container.rebindSync(RequestContextDiToken).toConstantValue(createMockRequestContext());
        }

        if (this.ignoreGlobals === false) {
            for (const [token, binding] of TesterGlobalReplacements.getBindings()) {
                const kebabKey = pascalToKebabCase(getKeyOfDiToken(token));
                if (this.validDeps.has(kebabKey) === false) {
                    continue;
                }

                if (binding.type === 'value') {
                    container.rebindSync(token).toConstantValue(binding.value);
                }
                else {
                    container.rebindSync(token).to(binding.impl).inSingletonScope();
                }
            }
        }

        for (const [key, binding] of this.bindingsMap) {
            const token = getDiTokenOfKey(key as string);

            if (binding.type === 'value') {
                container.rebindSync(token).toConstantValue(binding.value);
            }
            else {
                container.rebindSync(token).to(binding.impl).inSingletonScope();
            }
        }
    }
}
