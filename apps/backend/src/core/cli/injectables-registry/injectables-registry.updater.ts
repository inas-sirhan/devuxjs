import type { BindingType, InjectableConfig, InjectableConfigWithDependents, InjectableType } from './injectables-registry.types';
import { addInjectable, updateInjectable, removeInjectable as removeInjectableFromRegistry, getInjectable, injectableExists, getRegistry } from './injectables-registry.manager';
import { getDefaultIsGlobal } from './injectables-registry.helpers';



interface RegisterInjectableOptions {
    type: InjectableType;
    domain?: string; 
    bindingType?: BindingType; 
    isGlobal?: boolean; 
    isCore?: boolean; 
    dependencies?: string[]; 
}

function hasConfigDependents(config: InjectableConfig): config is InjectableConfigWithDependents {
    return config.type !== 'base' && config.type.startsWith('use-case:') === false;
}

export function addToDependents(injectableName: string, dependencyNames: string[]): void {
    for (const depName of dependencyNames) {
        const dependency = getInjectable(depName);
        if (dependency !== undefined && hasConfigDependents(dependency)) {
            if (dependency.dependents.includes(injectableName) === false) {
                dependency.dependents.push(injectableName);
                updateInjectable(depName, dependency);
            }
        }
    }
}


export function removeFromDependents(
    injectableName: string,
    dependencyNames: string[],
): void {
    for (const depName of dependencyNames) {
        const dependency = getInjectable(depName);
        if (dependency !== undefined && hasConfigDependents(dependency)) {
            const index = dependency.dependents.indexOf(injectableName);
            if (index !== -1) {
                dependency.dependents.splice(index, 1);
                updateInjectable(depName, dependency);
            }
        }
    }
}

export function registerInjectable(
    injectableName: string,
    options: RegisterInjectableOptions,
): void {
    const dependencyNames = options.dependencies !== undefined ? options.dependencies : [];

    const config = {
        type: options.type,
        bindingType: options.bindingType !== undefined ? options.bindingType : 'singleton',
        isGlobal: options.isGlobal !== undefined ? options.isGlobal : getDefaultIsGlobal(options.type),
        isCore: options.isCore !== undefined ? options.isCore : (options.type === 'service:core'),
        dependencies: dependencyNames, 
        dependents: [], 
        ...(options.domain !== undefined ? { domain: options.domain } : {}),
    } as InjectableConfig;

    addInjectable(injectableName, config);

    addToDependents(injectableName, dependencyNames);
}

export function registerEndpointInjectable(
    injectableName: string,
    options: {
        type: 'use-case:transactional' | 'use-case:non-transactional' | 'repo:endpoint:transactional' | 'repo:endpoint:non-transactional';
        domain: string;
        dependencies?: string[];
    },
): void {
    registerInjectable(injectableName, {
        type: options.type,
        domain: options.domain,
        ...(options.dependencies !== undefined ? { dependencies: options.dependencies } : {}),
    });
}

export function registerDomainRepo(
    injectableName: string,
    options: {
        domain: string;
        isTransactional: boolean;
        dependencies?: string[];
    },
): void {
    registerInjectable(injectableName, {
        type: options.isTransactional ? 'repo:domain:transactional' : 'repo:domain:non-transactional',
        domain: options.domain,
        ...(options.dependencies !== undefined ? { dependencies: options.dependencies } : {}),
    });
}


export function registerServiceRepo(
    injectableName: string,
    options: {
        domain: string;
        dependencies?: string[];
    },
): void {
    registerInjectable(injectableName, {
        type: 'repo:service:domain',
        domain: options.domain,
        ...(options.dependencies !== undefined ? { dependencies: options.dependencies } : {}),
    });
}


export function registerDomainService(
    injectableName: string,
    options: {
        domain: string;
        dependencies?: string[];
        bindingType?: BindingType;
    },
): void {
    registerInjectable(injectableName, {
        type: 'service:domain',
        domain: options.domain,
        ...(options.bindingType !== undefined ? { bindingType: options.bindingType } : {}),
        ...(options.dependencies !== undefined ? { dependencies: options.dependencies } : {}),
    });
}


export function registerAppService(
    injectableName: string,
    options: {
        dependencies?: string[];
        bindingType?: BindingType;
        isGlobal?: boolean;
    },
): void {
    registerInjectable(injectableName, {
        type: 'service:app',
        ...(options.bindingType !== undefined ? { bindingType: options.bindingType } : {}),
        ...(options.isGlobal !== undefined ? { isGlobal: options.isGlobal } : {}),
        ...(options.dependencies !== undefined ? { dependencies: options.dependencies } : {}),
    });
}


export function registerCoreService(
    injectableName: string,
    options: {
        dependencies?: string[];
        bindingType?: BindingType;
        isGlobal?: boolean; 
    },
): void {
    registerInjectable(injectableName, {
        type: 'service:core',
        ...(options.bindingType !== undefined ? { bindingType: options.bindingType } : {}),
        ...(options.isGlobal !== undefined ? { isGlobal: options.isGlobal } : {}),
        ...(options.dependencies !== undefined ? { dependencies: options.dependencies } : {}),
    });
}


export function updateInjectableDependencies(
    injectableName: string,
    newDependencyNames: string[],
): void {
    const injectable = getInjectable(injectableName);
    if (injectable === undefined) {
        throw new Error(
            `Cannot update dependencies: Injectable "${injectableName}" not found`,
        );
    }

    const oldDependencyNames = injectable.dependencies;

    const removed = oldDependencyNames.filter(
        (name) => newDependencyNames.includes(name) === false,
    );
    const added = newDependencyNames.filter(
        (name) => oldDependencyNames.includes(name) === false,
    );

    const newConfig: InjectableConfig = {
        ...injectable,
        dependencies: newDependencyNames,
    };
    updateInjectable(injectableName, newConfig);

    removeFromDependents(injectableName, removed);
    addToDependents(injectableName, added);
}


export function removeInjectable(
    injectableName: string,
    force = false,
): void {
    const injectable = getInjectable(injectableName);
    if (injectable === undefined) {
        throw new Error(
            `Cannot remove: Injectable "${injectableName}" not found`,
        );
    }

    if (injectable.type === 'base') {
        throw new Error(
            `Cannot remove "${injectableName}": Base classes are core framework classes and cannot be removed.`,
        );
    }

    if (force === false && hasConfigDependents(injectable) && injectable.dependents.length > 0) {
        throw new Error(
            `Cannot remove "${injectableName}": ${injectable.dependents.length} other injectable(s) depend on it:\n` +
                injectable.dependents.map((dep: string) => `  - ${dep}`).join('\n') +
                '\n\nRemove these dependencies first, or use force=true to remove anyway.',
        );
    }

    removeFromDependents(injectableName, injectable.dependencies);

    removeInjectableFromRegistry(injectableName);
}


export function batchRegisterInjectables(
    injectables: Array<{
        name: string;
        options: RegisterInjectableOptions;
    }>,
): void {
    for (const { name, options } of injectables) {
        registerInjectable(name, options);
    }
}

export function getInjectablesByType(
    type: InjectableType,
): Record<string, InjectableConfig> {
    const registry = getRegistry();
    const result: Record<string, InjectableConfig> = {};

    for (const [name, config] of Object.entries(registry)) {
        if (config.type === type) {
            result[name] = config;
        }
    }

    return result;
}


export function isInjectableRegistered(injectableName: string): boolean {
    return injectableExists(injectableName);
}
