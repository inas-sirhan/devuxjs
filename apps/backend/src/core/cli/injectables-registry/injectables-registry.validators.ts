import { hasEndpointId } from '@/core/cli/endpoints-ids-registry/endpoints-ids-registry.manager';
import { injectableTypes, domainInjectableTypes, type InjectableConfig, type InjectableConfigWithDependents, type InjectablesRegistry, type InjectableType } from '@/core/cli/injectables-registry/injectables-registry.types';
import { getRegistry } from '@/core/cli/injectables-registry/injectables-registry.manager';


export function validateEntry(config: InjectableConfig): void {
    if (injectableTypes.includes(config.type) === false) {
        throw new Error(
            `type must be one of: ${injectableTypes.join(', ')}`
        );
    }

    if (typeof config.isGlobal !== 'boolean') {
        throw new Error('isGlobal is required and must be a boolean');
    }

    if (typeof config.isCore !== 'boolean') {
        throw new Error('isCore is required and must be a boolean');
    }

    if (config.isCore === true) {
        if (['singleton', 'value'].includes(config.bindingType) === false) {
            throw new Error('bindingType must be one of: singleton, value');
        }
    }
    else {
        if (config.bindingType !== 'singleton') {
            throw new Error('bindingType must be "singleton" for non-core injectables');
        }

        const isDomainType = (domainInjectableTypes as readonly string[]).includes(config.type);
        if (isDomainType === true) {
            if (('domain' in config) === false || typeof config.domain !== 'string' || config.domain === '') {
                throw new Error(`domain is required for type "${config.type}"`);
            }
        }
    }

    if (Array.isArray(config.dependencies) === false) {
        throw new Error('dependencies must be an array');
    }

    for (const dep of config.dependencies) {
        if (/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(dep) === false) {
            throw new Error(`Invalid dependency "${dep}": must be a kebab-case injectable name`);
        }
    }

    if (hasConfigDependents(config) === true) {
        if (Array.isArray(config.dependents) === false) {
            throw new Error('dependents is required and must be an array');
        }

        for (const dep of config.dependents) {
            if (/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(dep) === false) {
                throw new Error(`Invalid dependent "${dep}": must be a kebab-case injectable name`);
            }
        }
    }
}


function isUseCaseType(type: InjectableType): boolean {
    return type.startsWith('use-case:');
}

function hasConfigDependents(config: InjectableConfig): config is InjectableConfigWithDependents {
    return config.type !== 'base' && isUseCaseType(config.type) === false;
}

function isServiceType(type: InjectableType): boolean {
    return type.startsWith('service:');
}


export function validateNoSelfInjection(injectableName: string, config: InjectableConfig): void {
    if (config.dependencies.includes(injectableName)) {
        throw new Error(
            `Self-injection detected: "${injectableName}" cannot depend on itself.\n` +
            `Found "${injectableName}" in dependencies array.`
        );
    }
}


export function validateDependenciesExist(
    injectableName: string,
    config: InjectableConfig,
    registry: InjectablesRegistry = getRegistry()
): void {
    for (const depName of config.dependencies) {
        if (registry[depName] === undefined) {
            throw new Error(
                `Dependency not found: "${injectableName}" depends on "${depName}", ` +
                `but it doesn't exist in the registry.\n` +
                `Make sure to register "${depName}" before registering "${injectableName}".`
            );
        }
    }
}


export function validateGlobalScopeConstraints(
    injectableName: string,
    config: InjectableConfig,
    registry: InjectablesRegistry = getRegistry()
): void {
    if (config.isGlobal === false) {
        return;
    }

    for (const depName of config.dependencies) {
        const dependency = registry[depName];

        if (dependency.isGlobal === false) {
            throw new Error(
                `Global scope violation: "${injectableName}" is global but depends on "${depName}" which is request-scoped.\n` +
                `Global injectables can only depend on other global injectables.\n` +
                `Either make "${depName}" global, or make "${injectableName}" request-scoped.`
            );
        }
    }
}


function checkEndpointClassNameCollision(injectableNameKebab: string): {
    hasCollision: boolean;
    endpointId?: string;
    suffix?: string;
    suggestion?: string;
} {
    const endpointSuffixes = [
        '-controller',
        '-use-case',
        '-repo',
        '-validator',
        '-presenter',
    ];

    for (const suffix of endpointSuffixes) {
        if (injectableNameKebab.endsWith(suffix) === true) {
            const endpointId = injectableNameKebab.slice(0, -suffix.length);

            if (hasEndpointId(endpointId) === true) {
                return {
                    hasCollision: true,
                    endpointId: endpointId,
                    suffix: suffix,
                    suggestion: `Consider renaming to avoid collision with the "${endpointId}" endpoint. ` +
                        `The name "${injectableNameKebab}" is reserved for the endpoint's generated class.`
                };
            }
        }
    }

    return { hasCollision: false };
}


export function validateNameCollision(injectableNameKebab: string, config: InjectableConfig): void {
    if (isServiceType(config.type) === false) {
        return;
    }

    const collision = checkEndpointClassNameCollision(injectableNameKebab);

    if (collision.hasCollision === true) {
        const endpointId = collision.endpointId !== undefined ? collision.endpointId : 'unknown';
        const suffix = collision.suffix !== undefined ? collision.suffix : 'unknown';
        const suggestion = collision.suggestion !== undefined ? collision.suggestion : '';

        throw new Error(
            `Name collision detected: "${injectableNameKebab}" collides with the "${endpointId}" endpoint.\n` +
            `The name pattern "*${suffix}" is reserved for endpoint-generated classes.\n` +
            suggestion
        );
    }
}


export function detectCircularDependency(
    newInjectableName: string,
    dependencies: string[],
    registry: InjectablesRegistry = getRegistry(),
): string[] | null {
    for (const depName of dependencies) {
        const cycle = findCyclePath(
            depName,
            newInjectableName,
            registry,
            [newInjectableName, depName],
        );

        if (cycle !== null) {
            return cycle;
        }
    }

    return null;
}

function findCyclePath(
    current: string,
    target: string,
    registry: InjectablesRegistry,
    path: string[],
): string[] | null {
    const injectable = registry[current];

    if (injectable === undefined) {
        return null;
    }

    for (const depName of injectable.dependencies) {
        if (depName === target) {
            return [...path, depName];
        }

        if (path.includes(depName) === true) {
            continue;
        }

        const cycle = findCyclePath(depName, target, registry, [...path, depName]);

        if (cycle !== null) {
            return cycle;
        }
    }

    return null;
}
