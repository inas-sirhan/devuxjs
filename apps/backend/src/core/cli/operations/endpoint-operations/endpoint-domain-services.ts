import path from 'path';
import * as p from '@clack/prompts';
import { kebabToPascalCase, kebabToCamelCase } from '@/core/cli/utils/case-converter';
import { addDomainServiceToUseCase, removeDomainServiceFromUseCase } from '@/core/cli/utils/ts-morph/use-case-injections.ts-morph';
import { addDependencyBindingsCall, removeDependencyBindingsCall } from '@/core/cli/utils/ts-morph/domain-service-operations.ts-morph';
import { shouldAddDependencyBindingsCall, getDependencyBindingsCallInfo } from '@/core/cli/utils/dependency-utils';
import { getAllInjectables, getInjectable, saveRegistry } from '@/core/cli/injectables-registry/injectables-registry.manager';
import { updateInjectableDependencies } from '@/core/cli/injectables-registry/injectables-registry.updater';
import { selectAction } from '@/core/cli/utils/ui-utils';
import { generateUseCaseTester } from '@/core/cli/utils/tester-generator/use-case-tester-generator';
import { BACKEND_SRC_PATH } from '@/core/cli/utils/cli-constants';

export async function addDomainServiceToEndpointOp(domain: string, endpoint: string): Promise<void> {
    const useCaseRegistryName = `${endpoint}-use-case`;
    const useCaseConfig = getInjectable(useCaseRegistryName);
    if (useCaseConfig === undefined) {
        p.log.error(`Use-case "${useCaseRegistryName}" not found in registry.`);
        return;
    }

    const injectables = getAllInjectables();
    const domainServices: { name: string; domain: string }[] = [];
    for (const [name, config] of Object.entries(injectables)) {
        if (config.type === 'service:domain' && 'domain' in config) {
            if (useCaseConfig.dependencies.includes(name) === false) {
                domainServices.push({ name, domain: config.domain });
            }
        }
    }

    if (domainServices.length === 0) {
        p.log.info('No domain services available to add (all already added or none exist).');
        return;
    }

    domainServices.sort((a, b) => a.name.localeCompare(b.name));

    const serviceName = await selectAction('Select a domain service to add:', domainServices.map(s => ({
        value: s.name,
        label: s.name,
        hint: `from ${s.domain} domain`,
    })));
    if (serviceName === null) {
        return;
    }

    const serviceConfig = getInjectable(serviceName);
    if (serviceConfig === undefined || ('domain' in serviceConfig) === false) {
        p.log.error(`Service "${serviceName}" not found in registry.`);
        return;
    }

    const serviceNameKebabCase = serviceName;
    const serviceNamePascalCase = kebabToPascalCase(serviceNameKebabCase);
    const serviceNameCamelCase = kebabToCamelCase(serviceNameKebabCase);
    const serviceDomain = serviceConfig.domain;

    const s = p.spinner();
    s.start('Adding domain service to use-case...');

    addDomainServiceToUseCase({
        domainNameKebabCase: domain,
        endpointIdKebabCase: endpoint,
        endpointIdPascalCase: kebabToPascalCase(endpoint),
        serviceNameKebabCase,
        serviceNamePascalCase,
        serviceNameCamelCase,
        serviceDomainKebabCase: serviceDomain,
    });

    const newDeps = [...useCaseConfig.dependencies, serviceName];
    updateInjectableDependencies(useCaseRegistryName, newDeps);

    saveRegistry();

    const needsBindingsCall = shouldAddDependencyBindingsCall(useCaseConfig, serviceConfig);
    if (needsBindingsCall === true) {
        const bindingsInfo = getDependencyBindingsCallInfo(useCaseRegistryName, useCaseConfig, serviceName, serviceConfig);
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

    s.stop(`Successfully added domain service "${serviceName}" to ${domain}/${endpoint}`);
}

export async function removeDomainServiceFromEndpointOp(domain: string, endpoint: string): Promise<void> {
    const useCaseRegistryName = `${endpoint}-use-case`;
    const useCaseConfig = getInjectable(useCaseRegistryName);
    if (useCaseConfig === undefined) {
        p.log.error(`Use-case "${useCaseRegistryName}" not found in registry.`);
        return;
    }

    const domainServiceDeps: { name: string; domain: string }[] = [];
    for (const depName of useCaseConfig.dependencies) {
        const depConfig = getInjectable(depName);
        if (depConfig !== undefined && depConfig.type === 'service:domain' && 'domain' in depConfig) {
            domainServiceDeps.push({ name: depName, domain: depConfig.domain });
        }
    }

    if (domainServiceDeps.length === 0) {
        p.log.info('No domain services to remove from this endpoint.');
        return;
    }

    domainServiceDeps.sort((a, b) => a.name.localeCompare(b.name));

    const serviceName = await selectAction('Select a domain service to remove:', domainServiceDeps.map(s => ({
        value: s.name,
        label: s.name,
        hint: `from ${s.domain} domain`,
    })));
    if (serviceName === null) {
        return;
    }

    const serviceConfig = getInjectable(serviceName);
    if (serviceConfig === undefined || ('domain' in serviceConfig) === false) {
        p.log.error(`Service "${serviceName}" not found in registry.`);
        return;
    }

    const serviceNameKebabCase = serviceName;
    const serviceNamePascalCase = kebabToPascalCase(serviceNameKebabCase);
    const serviceDomain = serviceConfig.domain;

    const s = p.spinner();
    s.start('Removing domain service from use-case...');

    removeDomainServiceFromUseCase({
        domainNameKebabCase: domain,
        endpointIdKebabCase: endpoint,
        endpointIdPascalCase: kebabToPascalCase(endpoint),
        serviceNameKebabCase,
        serviceNamePascalCase,
        serviceDomainKebabCase: serviceDomain,
    });

    const newDeps = useCaseConfig.dependencies.filter(d => d !== serviceName);
    updateInjectableDependencies(useCaseRegistryName, newDeps);

    saveRegistry();

    const needsBindingsCall = shouldAddDependencyBindingsCall(useCaseConfig, serviceConfig);
    if (needsBindingsCall === true) {
        const bindingsInfo = getDependencyBindingsCallInfo(useCaseRegistryName, useCaseConfig, serviceName, serviceConfig);
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

    s.stop(`Successfully removed domain service "${serviceName}" from ${domain}/${endpoint}`);
}
