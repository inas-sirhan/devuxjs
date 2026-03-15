import { getInjectable } from '@/core/cli/injectables-registry/injectables-registry.manager';
import { getInjectableTypeName, getLocation, getTypeImportPath } from '@/core/cli/injectables-registry/injectables-registry.helpers';
import { type InjectableConfig } from '@/core/cli/injectables-registry/injectables-registry.types';


export type Category = 'domains' | 'endpoints' | 'domain-repos' | 'domain-services' | 'app-services' | 'base-classes' | 'list-&-inspect' | 'visualize';

export type RepoOperation = 'write' | 'read' | 'delete';

export const BASE_CLASS_IDS = {
    USE_CASE_BASE: 'use-case-base',
    TRANSACTIONAL_USE_CASE: 'transactional-use-case',
    NON_TRANSACTIONAL_USE_CASE: 'non-transactional-use-case',
    REPO_BASE: 'repo-base',
    TRANSACTIONAL_REPO: 'transactional-repo',
    NON_TRANSACTIONAL_REPO: 'non-transactional-repo',
    DOMAIN_SERVICE_BASE: 'domain-service-base',
} as const;

export const ALLOWED_BASE_CLASS_IDS_FOR_DEPS = [
    BASE_CLASS_IDS.USE_CASE_BASE,
    BASE_CLASS_IDS.REPO_BASE,
    BASE_CLASS_IDS.DOMAIN_SERVICE_BASE,
] as const;



export function formatInjectableType(type: string, isGlobal?: boolean): string {
    switch (type) {
        case 'repo:endpoint:transactional':
            return 'Transactional Endpoint Repo';
        case 'repo:endpoint:non-transactional':
            return 'Non-Transactional Endpoint Repo';
        case 'repo:domain:transactional':
            return 'Transactional Domain Repo';
        case 'repo:domain:non-transactional':
            return 'Non-Transactional Domain Repo';
        case 'service:domain':
            return 'Domain Service';
        case 'service:app':
            if (isGlobal !== undefined) {
                return isGlobal ? 'App Service (global)' : 'App Service (request-scoped)';
            }
            return 'App Service';
        case 'use-case:transactional':
            return 'Transactional';
        case 'use-case:non-transactional':
            return 'Non-Transactional';
        default:
            return type;
    }
}


export function getBaseClassChain(injectableConfig: InjectableConfig): string[] {
    const type = injectableConfig.type;

    if (type === 'use-case:transactional') {
        return [BASE_CLASS_IDS.TRANSACTIONAL_USE_CASE, BASE_CLASS_IDS.USE_CASE_BASE];
    }
    if (type === 'use-case:non-transactional') {
        return [BASE_CLASS_IDS.NON_TRANSACTIONAL_USE_CASE, BASE_CLASS_IDS.USE_CASE_BASE];
    }
    if (type === 'repo:endpoint:transactional') {
        return [BASE_CLASS_IDS.TRANSACTIONAL_REPO, BASE_CLASS_IDS.REPO_BASE];
    }
    if (type === 'repo:endpoint:non-transactional') {
        return [BASE_CLASS_IDS.NON_TRANSACTIONAL_REPO, BASE_CLASS_IDS.REPO_BASE];
    }
    if (type === 'repo:domain:transactional') {
        return [BASE_CLASS_IDS.TRANSACTIONAL_REPO, BASE_CLASS_IDS.REPO_BASE];
    }
    if (type === 'repo:domain:non-transactional') {
        return [BASE_CLASS_IDS.NON_TRANSACTIONAL_REPO, BASE_CLASS_IDS.REPO_BASE];
    }
    if (type === 'repo:service:domain') {
        return [BASE_CLASS_IDS.TRANSACTIONAL_REPO, BASE_CLASS_IDS.REPO_BASE];
    }
    if (type === 'service:domain') {
        return [BASE_CLASS_IDS.DOMAIN_SERVICE_BASE];
    }

    return [];
}


export function getDependenciesFromBaseClasses(injectableConfig: InjectableConfig): string[] {
    const baseClasses = getBaseClassChain(injectableConfig);
    const allDeps = new Set<string>();

    for (const baseClassId of baseClasses) {
        const baseClassConfig = getInjectable(baseClassId);
        if (baseClassConfig !== undefined && 'dependencies' in baseClassConfig) {
            for (const dep of baseClassConfig.dependencies) {
                allDeps.add(dep);
            }
        }
    }

    return Array.from(allDeps);
}


export function collectAllDependencies(injectableName: string): string[] {
    const visited = new Set<string>();

    function dfs(name: string): void {
        if (visited.has(name) === true) {
            return;
        }

        const config = getInjectable(name);
        if (config === undefined) {
            throw new Error(`Dependency "${name}" not found in registry`);
        }

        visited.add(name);

        if ('dependencies' in config && Array.isArray(config.dependencies)) {
            for (const dep of config.dependencies) {
                dfs(dep);
            }
        }
    }

    dfs(injectableName);
    return Array.from(visited);
}


export interface DependencyImportInfo {
    registryName: string;
    interfaceName: string;
    importPath: string;
}


export function getDependencyImportInfo(registryName: string): DependencyImportInfo | null {
    const config = getInjectable(registryName);
    if (config === undefined) {
        return null;
    }

    const location = getLocation(registryName, config);
    const importPath = getTypeImportPath(location, config);
    const interfaceName = getInjectableTypeName(registryName, config);

    return {
        registryName,
        interfaceName,
        importPath,
    };
}

export function httpMethodToRepoOperation(httpMethod: string): RepoOperation {
    switch (httpMethod) {
        case 'post':
        case 'put':
        case 'patch':
            return 'write';
        case 'get':
            return 'read';
        case 'delete':
            return 'delete';
        default:
            return 'write'; 
    }
}
