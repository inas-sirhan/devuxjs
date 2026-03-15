import type { InjectableConfig, InjectablesRegistry, InjectableType } from '@/core/cli/injectables-registry/injectables-registry.types';
import { getRegistry } from '@/core/cli/injectables-registry/injectables-registry.manager';


function isRepoType(type: InjectableType): boolean {
    return type.startsWith('repo:');
}

function isUseCaseType(type: InjectableType): boolean {
    return type.startsWith('use-case:');
}

function isTransactionalRepo(type: InjectableType): boolean {
    return type === 'repo:domain:transactional'
        || type === 'repo:service:domain'
        || type === 'repo:endpoint:transactional';
}

function hasRepoInDependencyChain(
    injectableName: string,
    registry: InjectablesRegistry,
    visited: Set<string> = new Set()
): boolean {
    if (visited.has(injectableName) === true) {
        return false;
    }
    visited.add(injectableName);

    const injectable = registry[injectableName];
    if (injectable === undefined) {
        return false;
    }

    if (isRepoType(injectable.type) === true) {
        return true;
    }

    for (const depName of injectable.dependencies) {
        if (hasRepoInDependencyChain(depName, registry, visited)) {
            return true;
        }
    }

    return false;
}


function hasTransactionalRepoInDependencyChain(
    injectableName: string,
    registry: InjectablesRegistry,
    visited: Set<string> = new Set()
): { hasTransactionalRepo: boolean; path: string[] } {
    if (visited.has(injectableName) === true) {
        return { hasTransactionalRepo: false, path: [] };
    }
    visited.add(injectableName);

    const injectable = registry[injectableName];
    if (injectable === undefined) {
        return { hasTransactionalRepo: false, path: [] };
    }

    if (isTransactionalRepo(injectable.type) === true) {
        return { hasTransactionalRepo: true, path: [injectableName] };
    }

    for (const depName of injectable.dependencies) {
        const result = hasTransactionalRepoInDependencyChain(depName, registry, visited);
        if (result.hasTransactionalRepo === true) {
            return {
                hasTransactionalRepo: true,
                path: [injectableName, ...result.path]
            };
        }
    }

    return { hasTransactionalRepo: false, path: [] };
}


function extractOwnerNameKebab(name: string): string | null {
    if (name.endsWith('-repo') === true) {
        return name.slice(0, -5);
    }
    if (name.endsWith('-use-case') === true) {
        return name.slice(0, -9);
    }
    return null;
}


function validateRepoScopeInjection(
    injectorName: string,
    repoName: string,
    repoConfig: InjectableConfig
): void {
    if (isRepoType(repoConfig.type) === false) {
        return;
    }

    if (repoConfig.type === 'repo:domain:transactional' || repoConfig.type === 'repo:domain:non-transactional') {
        return;
    }

    if (repoConfig.type === 'repo:endpoint:transactional' || repoConfig.type === 'repo:endpoint:non-transactional') {
        const repoOwner = extractOwnerNameKebab(repoName);
        const expectedUseCase = repoOwner !== null ? `${repoOwner}-use-case` : null;

        if (injectorName !== expectedUseCase) {
            const useCaseLabel = expectedUseCase !== null ? expectedUseCase : 'its use-case';
            throw new Error(
                `Endpoint repo violation: "${repoName}" (${repoConfig.type}) can only be injected by "${useCaseLabel}".\n` +
                `"${injectorName}" cannot inject it.\n` +
                `If you need to share this repo, create it as a domain repo instead.`
            );
        }
    }

    if (repoConfig.type === 'repo:service:domain') {
        const repoOwner = extractOwnerNameKebab(repoName);
        const expectedService = repoOwner;

        if (injectorName !== expectedService) {
            const serviceLabel = expectedService !== null ? expectedService : 'its service';
            throw new Error(
                `Service repo violation: "${repoName}" (${repoConfig.type}) can only be injected by "${serviceLabel}".\n` +
                `"${injectorName}" cannot inject it.\n` +
                `If you need to share this repo, create it as a domain repo instead.`
            );
        }
    }
}


export function validateRepoCannotDependOnRepos(
    injectableName: string,
    config: InjectableConfig,
    registry: InjectablesRegistry = getRegistry()
): void {
    if (isRepoType(config.type) === false) {
        return;
    }

    for (const depName of config.dependencies) {
        if (hasRepoInDependencyChain(depName, registry)) {
            throw new Error(
                `Repo dependency violation: "${injectableName}" (${config.type}) cannot depend on "${depName}" ` +
                `because it has repositories in its dependency chain.\n` +
                `Repositories should only depend on services that don't make database calls.\n` +
                `Architectural rule: Repos should be single-purpose (one DB operation), not calling other repos.`
            );
        }
    }
}


export function validateUseCaseInjectionRules(
    injectableName: string,
    config: InjectableConfig,
    registry: InjectablesRegistry = getRegistry()
): void {
    if (isUseCaseType(config.type) === false) {
        return;
    }

    for (const depName of config.dependencies) {
        const dep = registry[depName];

        if (dep === undefined) {
            continue;
        }

        if (dep.type === 'repo:service:domain') {
            throw new Error(
                `Use-case injection violation: "${injectableName}" (${config.type}) cannot inject "${depName}" (${dep.type}).\n` +
                `Service-repos belong exclusively to their service.\n` +
                `Use-cases can inject: repo:endpoint:*, repo:domain:*, services.`
            );
        }

        validateRepoScopeInjection(injectableName, depName, dep);
    }
}


export function validateDomainServiceInjectionRules(
    injectableName: string,
    config: InjectableConfig,
    registry: InjectablesRegistry = getRegistry()
): void {

    if (config.type !== 'service:domain') {
        return;
    }


    for (const depName of config.dependencies) {
        const dep = registry[depName];

        if (dep === undefined) {
            continue;
        }

        if (dep.type === 'repo:endpoint:transactional' || dep.type === 'repo:endpoint:non-transactional') {
            throw new Error(
                `Domain-service injection violation: "${injectableName}" (service:domain) cannot inject "${depName}" (${dep.type}).\n` +
                `Endpoint repos belong exclusively to their use-case.\n` +
                `Domain-services can inject: repo:domain:transactional, repo:service:domain (their own), other services.`
            );
        }

        validateRepoScopeInjection(injectableName, depName, dep);
    }
}


export function validateNonTransactionalUseCaseCannotUseTransactionalRepos(
    injectableName: string,
    config: InjectableConfig,
    registry: InjectablesRegistry = getRegistry()
): void {
    if (config.type !== 'use-case:non-transactional') {
        return;
    }

    for (const depName of config.dependencies) {
        const result = hasTransactionalRepoInDependencyChain(depName, registry);
        if (result.hasTransactionalRepo === true) {
            const pathStr = [injectableName, ...result.path].join(' → ');
            throw new Error(
                `Non-transactional use-case violation: "${injectableName}" is non-transactional ` +
                `but depends on a transactional repo through this chain:\n\n  ${pathStr}\n\n` +
                `Transactional repos require transaction connections to function correctly.\n` +
                `Solutions:\n` +
                `  1. Make this use-case transactional (extends TransactionalUseCase)\n` +
                `  2. Remove the dependency on "${result.path[0]}" (or refactor its transitive dependencies)\n` +
                `  3. If "${result.path[result.path.length - 1]}" doesn't actually need transactions, ` +
                `change it to a non-transactional repo or app-service`
            );
        }
    }
}
