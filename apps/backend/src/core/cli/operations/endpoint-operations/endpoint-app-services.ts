import path from 'path';
import * as p from '@clack/prompts';
import { kebabToPascalCase, kebabToCamelCase } from '@/core/cli/utils/case-converter';
import { addAppServiceToUseCase, removeAppServiceFromUseCase } from '@/core/cli/utils/ts-morph/use-case-injections.ts-morph';
import { addDependencyBindingsCall, removeDependencyBindingsCall } from '@/core/cli/utils/ts-morph/domain-service-operations.ts-morph';
import { shouldAddDependencyBindingsCall, getDependencyBindingsCallInfo } from '@/core/cli/utils/dependency-utils';
import { getAllInjectables, getInjectable, saveRegistry } from '@/core/cli/injectables-registry/injectables-registry.manager';
import { updateInjectableDependencies } from '@/core/cli/injectables-registry/injectables-registry.updater';
import { selectAction } from '@/core/cli/utils/ui-utils';
import { generateUseCaseTester } from '@/core/cli/utils/tester-generator/use-case-tester-generator';
import { BACKEND_SRC_PATH } from '@/core/cli/utils/cli-constants';

export async function addAppServiceToEndpointOp(domain: string, endpoint: string): Promise<void> {
    const useCaseRegistryName = `${endpoint}-use-case`;
    const useCaseConfig = getInjectable(useCaseRegistryName);
    if (useCaseConfig === undefined) {
        p.log.error(`Use-case "${useCaseRegistryName}" not found in registry.`);
        return;
    }

    const injectables = getAllInjectables();
    const appServices: { name: string }[] = [];
    for (const [name, config] of Object.entries(injectables)) {
        if (config.type === 'service:app') {
            if (useCaseConfig.dependencies.includes(name) === false) {
                appServices.push({ name });
            }
        }
    }

    if (appServices.length === 0) {
        p.log.info('No app services available to add (all already added or none exist).');
        return;
    }

    appServices.sort((a, b) => a.name.localeCompare(b.name));

    const serviceName = await selectAction('Select an app service to add:', appServices.map(s => ({
        value: s.name,
        label: s.name,
    })));
    if (serviceName === null) {
        return;
    }

    const serviceNameKebabCase = serviceName;
    const serviceNamePascalCase = kebabToPascalCase(serviceNameKebabCase);
    const serviceNameCamelCase = kebabToCamelCase(serviceNameKebabCase);

    const s = p.spinner();
    s.start('Adding app service to use-case...');

    addAppServiceToUseCase({
        domainNameKebabCase: domain,
        endpointIdKebabCase: endpoint,
        endpointIdPascalCase: kebabToPascalCase(endpoint),
        serviceNameKebabCase,
        serviceNamePascalCase,
        serviceNameCamelCase,
    });

    const newDeps = [...useCaseConfig.dependencies, serviceName];
    updateInjectableDependencies(useCaseRegistryName, newDeps);

    saveRegistry();

    const serviceConfig = getInjectable(serviceName);
    if (serviceConfig !== undefined) {
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
    }

    generateUseCaseTester(domain, endpoint);

    s.stop(`Successfully added app service "${serviceName}" to ${domain}/${endpoint}`);
}

export async function removeAppServiceFromEndpointOp(domain: string, endpoint: string): Promise<void> {
    const useCaseRegistryName = `${endpoint}-use-case`;
    const useCaseConfig = getInjectable(useCaseRegistryName);
    if (useCaseConfig === undefined) {
        p.log.error(`Use-case "${useCaseRegistryName}" not found in registry.`);
        return;
    }

    const appServiceDeps: { name: string }[] = [];
    for (const depName of useCaseConfig.dependencies) {
        const depConfig = getInjectable(depName);
        if (depConfig !== undefined && depConfig.type === 'service:app') {
            appServiceDeps.push({ name: depName });
        }
    }

    if (appServiceDeps.length === 0) {
        p.log.info('No app services to remove from this endpoint.');
        return;
    }

    appServiceDeps.sort((a, b) => a.name.localeCompare(b.name));

    const serviceName = await selectAction('Select an app service to remove:', appServiceDeps.map(s => ({
        value: s.name,
        label: s.name,
    })));
    if (serviceName === null) {
        return;
    }

    const serviceNameKebabCase = serviceName;
    const serviceNamePascalCase = kebabToPascalCase(serviceNameKebabCase);

    const s = p.spinner();
    s.start('Removing app service from use-case...');

    removeAppServiceFromUseCase({
        domainNameKebabCase: domain,
        endpointIdKebabCase: endpoint,
        endpointIdPascalCase: kebabToPascalCase(endpoint),
        serviceNameKebabCase,
        serviceNamePascalCase,
    });

    const newDeps = useCaseConfig.dependencies.filter(d => d !== serviceName);
    updateInjectableDependencies(useCaseRegistryName, newDeps);

    saveRegistry();

    const serviceConfig = getInjectable(serviceName);
    if (serviceConfig !== undefined) {
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
    }

    generateUseCaseTester(domain, endpoint);

    s.stop(`Successfully removed app service "${serviceName}" from ${domain}/${endpoint}`);
}
