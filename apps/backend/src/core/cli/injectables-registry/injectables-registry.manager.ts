import type { InjectableConfig, InjectablesRegistry } from '@/core/cli/injectables-registry/injectables-registry.types';
import { validateEntry, detectCircularDependency } from '@/core/cli/injectables-registry/injectables-registry.validators';
import fs from 'fs';
import path from 'path';


const __dirname = import.meta.dirname;
const REGISTRY_PATH = path.join(__dirname, '..', '..', '..', '__internals__', 'registries', 'injectables-registry.json');

let cachedRegistry: InjectablesRegistry | null = null;

export function resetRegistryCache(): void {
    cachedRegistry = null;
}

export function getRegistry(): InjectablesRegistry {
    if (cachedRegistry === null) {
        const data = fs.readFileSync(REGISTRY_PATH, 'utf-8');
        cachedRegistry = JSON.parse(data) as InjectablesRegistry;
    }
    return cachedRegistry;
}

export function saveRegistry(): void {
    if (cachedRegistry === null) {
        throw new Error('Cannot save registry: no cached data. Call getRegistry() first.');
    }

    const data = JSON.stringify(cachedRegistry, null, 2);
    const maxRetries = 5;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            fs.writeFileSync(REGISTRY_PATH, data, 'utf-8');
            return;
        }
        catch (error) {
            if (attempt === maxRetries) {
                throw error;
            }
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200);
        }
    }
}


export function getInjectable(injectableName: string): InjectableConfig | undefined {
    const registry = getRegistry();
    return registry[injectableName];
}


export function getAllInjectables(): Record<string, InjectableConfig> {
    return getRegistry();
}


export function injectableExists(injectableName: string): boolean {
    const registry = getRegistry();
    return registry[injectableName] !== undefined;
}

export function getDependents(injectableName: string): string[] {
    const registry = getRegistry();
    const dependents: string[] = [];

    for (const [name, entry] of Object.entries(registry)) {
        if (entry.dependencies.includes(injectableName) === true) {
            dependents.push(name);
        }
    }

    return dependents;
}



export function addInjectable(injectableName: string, config: InjectableConfig): void {
    validateEntry(config);

    const registry = getRegistry();

    if (registry[injectableName] !== undefined) {
        throw new Error(`Injectable "${injectableName}" already exists in registry`);
    }

    const cycle = detectCircularDependency(injectableName, config.dependencies, registry);
    if (cycle !== null) {
        throw new Error(
            `Circular dependency detected: ${cycle.join(' → ')}\n` +
            'Circular dependencies are not allowed. Please refactor your dependencies.',
        );
    }

    registry[injectableName] = config;
}

export function removeInjectable(injectableName: string): void {
    const registry = getRegistry();

    if (registry[injectableName] === undefined) {
        throw new Error(`Injectable "${injectableName}" not found in registry`);
    }

    const dependents: string[] = [];
    for (const [name, entry] of Object.entries(registry)) {
        if (entry.dependencies.includes(injectableName) === true) {
            dependents.push(name);
        }
    }

    if (dependents.length > 0) {
        throw new Error(
            `Cannot remove injectable "${injectableName}" because it has dependents:\n` +
            dependents.map(dep => `  - ${dep}`).join('\n') +
            '\n\nRemove or update these injectables first.',
        );
    }

    delete registry[injectableName];
}


export function updateInjectable(
    injectableName: string,
    updates: Partial<InjectableConfig>,
): void {
    const registry = getRegistry();

    const existing = registry[injectableName];
    if (existing === undefined) {
        throw new Error(`Injectable "${injectableName}" not found in registry`);
    }

    const updated = {
        ...existing,
        ...updates,
    } as InjectableConfig;

    validateEntry(updated);

    if (updates.dependencies !== undefined) {
        const registryWithoutCurrent = { ...registry };
        delete registryWithoutCurrent[injectableName];

        const cycle = detectCircularDependency(injectableName, updated.dependencies, registryWithoutCurrent);

        if (cycle !== null) {
            throw new Error(
                `Circular dependency detected: ${cycle.join(' → ')}\n` +
                'This update would create a circular dependency.',
            );
        }
    }

    registry[injectableName] = updated;
}
