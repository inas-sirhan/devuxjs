import path from 'path';
import fs from 'fs';
import { getAllInjectables, getInjectable } from '@/core/cli/injectables-registry/injectables-registry.manager';
import { getAllDomains } from '@/core/cli/domains-registry/domains-registry.manager';
import { BACKEND_SRC_PATH } from '@/core/cli/utils/cli-constants';

export function getExistingDomains(): string[] {
    return getAllDomains().sort();
}

export function getEndpointsForDomain(domain: string): string[] {
    const endpointsPath = path.join(BACKEND_SRC_PATH, 'domains', domain, 'endpoints');
    if (fs.existsSync(endpointsPath) === false) {
        return [];
    }

    return fs.readdirSync(endpointsPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)
        .sort();
}

export function getDomainReposForDomain(domain: string): string[] {
    const injectables = getAllInjectables();
    const repos: string[] = [];

    for (const [name, config] of Object.entries(injectables)) {
        if ((config.type === 'repo:domain:transactional' || config.type === 'repo:domain:non-transactional') && 'domain' in config && config.domain === domain) {
            repos.push(name.replace(/-repo$/, ''));
        }
    }

    return repos.sort();
}

export function getDomainServicesForDomain(domain: string): string[] {
    const servicesPath = path.join(BACKEND_SRC_PATH, 'domains', domain, 'services');
    if (fs.existsSync(servicesPath) === false) {
        return [];
    }

    return fs.readdirSync(servicesPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)
        .sort();
}

export function getAppServices(): string[] {
    const injectables = getAllInjectables();
    const appServices: string[] = [];

    for (const [name, config] of Object.entries(injectables)) {
        if (config.type === 'service:app') {
            appServices.push(name);
        }
    }

    return appServices.sort();
}

export function getEndpointRepos(_domain: string, endpointId: string): string[] {
    const useCaseName = `${endpointId}-use-case`;
    const useCaseConfig = getInjectable(useCaseName);

    if (useCaseConfig === undefined) {
        return [];
    }

    const repos = useCaseConfig.dependencies.filter(depName => {
        const depConfig = getInjectable(depName);
        return depConfig?.type === 'repo:endpoint:transactional' ||
               depConfig?.type === 'repo:endpoint:non-transactional';
    });

    return repos.sort();
}
