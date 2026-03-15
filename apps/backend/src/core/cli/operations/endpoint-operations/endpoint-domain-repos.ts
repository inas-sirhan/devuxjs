import path from 'path';
import * as p from '@clack/prompts';
import { kebabToPascalCase, kebabToCamelCase } from '@/core/cli/utils/case-converter';
import { addDomainRepoToUseCase, removeDomainRepoFromUseCase } from '@/core/cli/utils/ts-morph/use-case-injections.ts-morph';
import { addDependencyBindingsCall, removeDependencyBindingsCall } from '@/core/cli/utils/ts-morph/domain-service-operations.ts-morph';
import { shouldAddDependencyBindingsCall, getDependencyBindingsCallInfo } from '@/core/cli/utils/dependency-utils';
import { getAllInjectables, getInjectable, saveRegistry } from '@/core/cli/injectables-registry/injectables-registry.manager';
import { updateInjectableDependencies } from '@/core/cli/injectables-registry/injectables-registry.updater';
import { selectAction } from '@/core/cli/utils/ui-utils';
import { generateUseCaseTester } from '@/core/cli/utils/tester-generator/use-case-tester-generator';
import { BACKEND_SRC_PATH } from '@/core/cli/utils/cli-constants';

export async function addDomainRepoToEndpoint(domain: string, endpoint: string): Promise<void> {
    const useCaseRegistryName = `${endpoint}-use-case`;
    const useCaseConfig = getInjectable(useCaseRegistryName);
    if (useCaseConfig === undefined) {
        p.log.error(`Use-case "${useCaseRegistryName}" not found in registry.`);
        return;
    }

    const isTransactionalUseCase = useCaseConfig.type === 'use-case:transactional';
    const targetRepoType = isTransactionalUseCase ? 'repo:domain:transactional' : 'repo:domain:non-transactional';

    const injectables = getAllInjectables();
    const domainRepos: { name: string; domain: string }[] = [];
    for (const [name, config] of Object.entries(injectables)) {
        if (config.type === targetRepoType && 'domain' in config) {
            if (useCaseConfig.dependencies.includes(name) === false) {
                domainRepos.push({ name, domain: config.domain });
            }
        }
    }

    if (domainRepos.length === 0) {
        p.log.info('No domain repos available to add (all already added or none exist).');
        return;
    }

    domainRepos.sort((a, b) => a.name.localeCompare(b.name));

    const repoName = await selectAction('Select a domain repo to add:', domainRepos.map(r => ({
        value: r.name,
        label: r.name,
        hint: `from ${r.domain} domain`,
    })));
    if (repoName === null) {
        return;
    }

    const repoConfig = getInjectable(repoName);
    if (repoConfig === undefined || !('domain' in repoConfig)) {
        p.log.error(`Repo "${repoName}" not found in registry.`);
        return;
    }

    const repoNameWithoutSuffix = repoName.replace(/-repo$/, '');
    const repoNameKebabCase = repoNameWithoutSuffix;
    const repoNamePascalCase = kebabToPascalCase(repoNameKebabCase);
    const repoNameCamelCase = kebabToCamelCase(repoNameKebabCase);
    const repoDomain = repoConfig.domain;

    const s = p.spinner();
    s.start('Adding domain repo to use-case...');

    addDomainRepoToUseCase({
        domainNameKebabCase: domain,
        endpointIdKebabCase: endpoint,
        endpointIdPascalCase: kebabToPascalCase(endpoint),
        repoNameKebabCase,
        repoNamePascalCase,
        repoNameCamelCase,
        repoDomainKebabCase: repoDomain,
    });

    const newDeps = [...useCaseConfig.dependencies, repoName];
    updateInjectableDependencies(useCaseRegistryName, newDeps);

    saveRegistry();

    const needsBindingsCall = shouldAddDependencyBindingsCall(useCaseConfig, repoConfig);
    if (needsBindingsCall === true) {
        const bindingsInfo = getDependencyBindingsCallInfo(useCaseRegistryName, useCaseConfig, repoName, repoConfig);
        if (bindingsInfo !== null) {
            addDependencyBindingsCall({
                bindingsFilePath: path.join(BACKEND_SRC_PATH, bindingsInfo.bindingsFilePath),
                setupFunctionName: bindingsInfo.setupFunctionName,
                dependencyBindingsImportPath: bindingsInfo.dependencyBindingsImportPath,
                dependencySetupFunctionName: bindingsInfo.dependencySetupFunctionName,
            });
        }
    }

    generateUseCaseTester(domain, endpoint);

    s.stop(`Successfully added domain repo "${repoName}" to ${domain}/${endpoint}`);
}

export async function removeDomainRepoFromEndpoint(domain: string, endpoint: string): Promise<void> {
    const useCaseRegistryName = `${endpoint}-use-case`;
    const useCaseConfig = getInjectable(useCaseRegistryName);
    if (useCaseConfig === undefined) {
        p.log.error(`Use-case "${useCaseRegistryName}" not found in registry.`);
        return;
    }

    const domainRepoDeps: { name: string; domain: string }[] = [];
    for (const depName of useCaseConfig.dependencies) {
        const depConfig = getInjectable(depName);
        if (depConfig !== undefined && (depConfig.type === 'repo:domain:transactional' || depConfig.type === 'repo:domain:non-transactional') && 'domain' in depConfig) {
            domainRepoDeps.push({ name: depName, domain: depConfig.domain });
        }
    }

    if (domainRepoDeps.length === 0) {
        p.log.info('No domain repos to remove from this endpoint.');
        return;
    }

    domainRepoDeps.sort((a, b) => a.name.localeCompare(b.name));

    const repoName = await selectAction('Select a domain repo to remove:', domainRepoDeps.map(r => ({
        value: r.name,
        label: r.name,
        hint: `from ${r.domain} domain`,
    })));
    if (repoName === null) {
        return;
    }

    const repoConfig = getInjectable(repoName);
    if (repoConfig === undefined || !('domain' in repoConfig)) {
        p.log.error(`Repo "${repoName}" not found in registry.`);
        return;
    }

    const repoNameWithoutSuffix = repoName.replace(/-repo$/, '');
    const repoNameKebabCase = repoNameWithoutSuffix;
    const repoNamePascalCase = kebabToPascalCase(repoNameKebabCase);
    const repoDomain = repoConfig.domain;

    const s = p.spinner();
    s.start('Removing domain repo from use-case...');

    removeDomainRepoFromUseCase({
        domainNameKebabCase: domain,
        endpointIdKebabCase: endpoint,
        endpointIdPascalCase: kebabToPascalCase(endpoint),
        repoNameKebabCase,
        repoNamePascalCase,
        repoDomainKebabCase: repoDomain,
    });

    const newDeps = useCaseConfig.dependencies.filter(d => d !== repoName);
    updateInjectableDependencies(useCaseRegistryName, newDeps);

    saveRegistry();

    const needsBindingsCall = shouldAddDependencyBindingsCall(useCaseConfig, repoConfig);
    if (needsBindingsCall === true) {
        const bindingsInfo = getDependencyBindingsCallInfo(useCaseRegistryName, useCaseConfig, repoName, repoConfig);
        if (bindingsInfo !== null) {
            removeDependencyBindingsCall({
                bindingsFilePath: path.join(BACKEND_SRC_PATH, bindingsInfo.bindingsFilePath),
                setupFunctionName: bindingsInfo.setupFunctionName,
                dependencyBindingsImportPath: bindingsInfo.dependencyBindingsImportPath,
                dependencySetupFunctionName: bindingsInfo.dependencySetupFunctionName,
            });
        }
    }

    generateUseCaseTester(domain, endpoint);

    s.stop(`Successfully removed domain repo "${repoName}" from ${domain}/${endpoint}`);
}
