import { describe, it, expect, afterEach } from 'vitest';
import type { InjectableConfig } from '@/core/cli/injectables-registry/injectables-registry.types';
import { addInjectable, getInjectable, getRegistry, resetRegistryCache } from '@/core/cli/injectables-registry/injectables-registry.manager';
import { addToDependents, removeInjectable } from '@/core/cli/injectables-registry/injectables-registry.updater';

const PREFIX = 'rgtest-';

function appService(deps: string[] = []): InjectableConfig {
    return { type: 'service:app', isCore: false, isGlobal: true, bindingType: 'singleton', dependencies: deps, dependents: [] };
}
function endpointRepo(deps: string[] = []): InjectableConfig {
    return { type: 'repo:endpoint:non-transactional', isCore: false, isGlobal: false, bindingType: 'singleton', domain: 'rgtest', dependencies: deps, dependents: [] };
}
function useCase(deps: string[] = []): InjectableConfig {
    return { type: 'use-case:non-transactional', isCore: false, isGlobal: false, bindingType: 'singleton', domain: 'rgtest', dependencies: deps };
}
function domainService(deps: string[] = []): InjectableConfig {
    return { type: 'service:domain', isCore: false, isGlobal: false, bindingType: 'singleton', domain: 'rgtest', dependencies: deps, dependents: [] };
}
function serviceRepo(deps: string[] = []): InjectableConfig {
    return { type: 'repo:service:domain', isCore: false, isGlobal: false, bindingType: 'singleton', domain: 'rgtest', dependencies: deps, dependents: [] };
}

function add(name: string, config: InjectableConfig): void {
    addInjectable(name, config);
    addToDependents(name, config.dependencies);
}

function dependentsOf(name: string): string[] {
    const node = getInjectable(name);
    if (node === undefined || ('dependents' in node) === false) return [];
    return node.dependents;
}

function assertConsistent(): void {
    const reg = getRegistry();
    const names = new Set(Object.keys(reg));
    for (const [name, e] of Object.entries(reg)) {
        for (const d of e.dependencies) {
            expect(names.has(d), `forward edge ${name} -> ${d} points to missing node`).toBe(true);
            const dep = reg[d];
            if ('dependents' in dep) {
                expect(dep.dependents.includes(name), `${d}.dependents should mirror ${name}`).toBe(true);
            }
        }
        if ('dependents' in e) {
            for (const dt of e.dependents) {
                expect(names.has(dt), `${name}.dependents has orphan ${dt}`).toBe(true);
                expect(reg[dt].dependencies.includes(name), `${dt}.dependencies should contain ${name}`).toBe(true);
            }
        }
    }
}

describe('injectables registry graph integrity on delete', () => {
    afterEach(() => {
        resetRegistryCache();
    });

    it('T1 — scrubs the reverse edge when a node is deleted', () => {
        add(`${PREFIX}b`, appService());
        add(`${PREFIX}a`, appService([`${PREFIX}b`]));
        expect(dependentsOf(`${PREFIX}b`)).toContain(`${PREFIX}a`);

        removeInjectable(`${PREFIX}a`);

        expect(dependentsOf(`${PREFIX}b`)).not.toContain(`${PREFIX}a`);
        assertConsistent();
    });

    it('T2 — still blocks deleting a node that others depend on', () => {
        add(`${PREFIX}b`, appService());
        add(`${PREFIX}a`, appService([`${PREFIX}b`]));

        expect(() => removeInjectable(`${PREFIX}b`)).toThrow();
        expect(getInjectable(`${PREFIX}b`)).toBeDefined();
    });

    it('T3 — delete then recreate leaves dependents correct', () => {
        add(`${PREFIX}b`, appService());
        add(`${PREFIX}c`, appService());
        add(`${PREFIX}a`, appService([`${PREFIX}b`]));

        removeInjectable(`${PREFIX}a`);
        add(`${PREFIX}a`, appService([`${PREFIX}c`]));

        expect(dependentsOf(`${PREFIX}b`)).not.toContain(`${PREFIX}a`);
        expect(dependentsOf(`${PREFIX}c`)).toContain(`${PREFIX}a`);
        assertConsistent();
    });

    it('T5 — cascade endpoint delete (use-case + 2 repos), parent-first, leaves no orphans', () => {
        add(`${PREFIX}svc`, appService());
        add(`${PREFIX}r1`, endpointRepo([`${PREFIX}svc`]));
        add(`${PREFIX}r2`, endpointRepo([`${PREFIX}svc`]));
        add(`${PREFIX}uc`, useCase([`${PREFIX}r1`, `${PREFIX}r2`]));

        removeInjectable(`${PREFIX}uc`);
        removeInjectable(`${PREFIX}r1`);
        removeInjectable(`${PREFIX}r2`);

        expect(dependentsOf(`${PREFIX}svc`)).not.toContain(`${PREFIX}r1`);
        expect(dependentsOf(`${PREFIX}svc`)).not.toContain(`${PREFIX}r2`);
        expect(getInjectable(`${PREFIX}uc`)).toBeUndefined();
        assertConsistent();
    });

    it('T6 — domain-service cascade: parent (service) depends on its repos, so service must be removed first', () => {
        add(`${PREFIX}sr1`, serviceRepo());
        add(`${PREFIX}sr2`, serviceRepo());
        add(`${PREFIX}dsvc`, domainService([`${PREFIX}sr1`, `${PREFIX}sr2`]));

        expect(() => removeInjectable(`${PREFIX}sr1`)).toThrow();

        removeInjectable(`${PREFIX}dsvc`);
        removeInjectable(`${PREFIX}sr1`);
        removeInjectable(`${PREFIX}sr2`);

        expect(getInjectable(`${PREFIX}dsvc`)).toBeUndefined();
        expect(getInjectable(`${PREFIX}sr1`)).toBeUndefined();
        expect(getInjectable(`${PREFIX}sr2`)).toBeUndefined();
        assertConsistent();
    });
});
