import { kebabToPascalCase } from '@/core/cli/utils/case-converter';
import { getLocation } from '@/core/cli/injectables-registry/injectables-registry.helpers';
import { type InjectableConfig } from '@/core/cli/injectables-registry/injectables-registry.types';


export interface DependencyBindingsCallInfo {
    bindingsFilePath: string;
    setupFunctionName: string;
    dependencyBindingsImportPath: string;
    dependencySetupFunctionName: string;
}

export function shouldAddDependencyBindingsCall(
    injectableConfig: InjectableConfig,
    dependencyConfig: InjectableConfig
): boolean {
    const injectableType = injectableConfig.type;
    const depType = dependencyConfig.type;

    if (injectableType === 'repo:endpoint:transactional' ||
        injectableType === 'repo:endpoint:non-transactional' ||
        injectableType === 'repo:domain:transactional' ||
        injectableType === 'repo:domain:non-transactional' ||
        injectableType === 'repo:service:domain') {
        if (depType === 'service:app' && 'isGlobal' in dependencyConfig && dependencyConfig.isGlobal === false) {
            return true;
        }
    }

    if (injectableType === 'service:domain') {
        if (depType === 'repo:domain:transactional' || depType === 'repo:service:domain') {
            return true;
        }
        if (depType === 'service:app' && 'isGlobal' in dependencyConfig && dependencyConfig.isGlobal === false) {
            return true;
        }
    }

    if (injectableType === 'use-case:transactional' || injectableType === 'use-case:non-transactional') {
        if (depType === 'service:domain' || depType === 'repo:domain:transactional' || depType === 'repo:domain:non-transactional') {
            return true;
        }
        if (depType === 'service:app' && 'isGlobal' in dependencyConfig && dependencyConfig.isGlobal === false) {
            return true;
        }
    }

    if (injectableType === 'service:app') {
        if (depType === 'service:app' && 'isGlobal' in dependencyConfig && dependencyConfig.isGlobal === false) {
            return true;
        }
    }

    return false;
}



export function getDependencyBindingsCallInfo(
    injectableName: string,
    injectableConfig: InjectableConfig,
    dependencyName: string,
    dependencyConfig: InjectableConfig
): DependencyBindingsCallInfo | null {
    const injectableType = injectableConfig.type;
    const depType = dependencyConfig.type;

    let dependencyBindingsImportPath: string;
    let dependencySetupFunctionName: string;

    if (depType === 'service:app') {
        dependencyBindingsImportPath = `@/__internals__/app-services/${dependencyName}/${dependencyName}.inversify.bindings`;
        dependencySetupFunctionName = `setup${kebabToPascalCase(dependencyName)}Bindings`;
    }
    else {
        if ((depType === 'repo:domain:transactional' || depType === 'repo:domain:non-transactional') && 'domain' in dependencyConfig) {
            const repoName = dependencyName.replace(/-repo$/, '');
            dependencyBindingsImportPath = `@/__internals__/domains/${dependencyConfig.domain}/repos/${repoName}/${repoName}.repo.inversify.bindings`;
            dependencySetupFunctionName = `setup${kebabToPascalCase(repoName)}RepoBindings`;
        }
        else {
            if (depType === 'repo:service:domain' && 'domain' in dependencyConfig) {
                const repoName = dependencyName.replace(/-repo$/, '');
                const serviceName = dependencyConfig.dependents[0];
                if (serviceName === undefined || serviceName === '') {
                    return null;
                }
                dependencyBindingsImportPath = `@/__internals__/domains/${dependencyConfig.domain}/services/${serviceName}/repos/${repoName}/${repoName}.repo.inversify.bindings`;
                dependencySetupFunctionName = `setup${kebabToPascalCase(repoName)}RepoBindings`;
            }
            else {
                if (depType === 'service:domain' && 'domain' in dependencyConfig) {
                    dependencyBindingsImportPath = `@/__internals__/domains/${dependencyConfig.domain}/services/${dependencyName}/${dependencyName}.inversify.bindings`;
                    dependencySetupFunctionName = `setup${kebabToPascalCase(dependencyName)}Bindings`;
                }
                else {
                    return null;
                }
            }
        }
    }

    let bindingsFilePath: string;
    let setupFunctionName: string;

    if (injectableType === 'repo:endpoint:transactional' || injectableType === 'repo:endpoint:non-transactional') {
        if (('domain' in injectableConfig) === false) {
            return null;
        }
        const repoName = injectableName.replace(/-repo$/, '');
        const location = getLocation(injectableName, injectableConfig);
        const parts = location.split('/');
        const endpointIdx = parts.indexOf('endpoints');
        if (endpointIdx === -1 || endpointIdx + 1 >= parts.length) {
            return null;
        }
        const endpointId = parts[endpointIdx + 1];
        const domain = injectableConfig.domain;

        bindingsFilePath = `__internals__/domains/${domain}/endpoints/${endpointId}/repos/${repoName}/${repoName}.repo.inversify.bindings.ts`;
        setupFunctionName = `setup${kebabToPascalCase(repoName)}RepoBindings`;
    }
    else {
        if (injectableType === 'repo:domain:transactional' || injectableType === 'repo:domain:non-transactional') {
            if (('domain' in injectableConfig) === false) {
                return null;
            }
            const repoName = injectableName.replace(/-repo$/, '');
            bindingsFilePath = `__internals__/domains/${injectableConfig.domain}/repos/${repoName}/${repoName}.repo.inversify.bindings.ts`;
            setupFunctionName = `setup${kebabToPascalCase(repoName)}RepoBindings`;
        }
        else {
            if (injectableType === 'repo:service:domain') {
                if (('domain' in injectableConfig) === false) {
                    return null;
                }
                const repoName = injectableName.replace(/-repo$/, '');
                const serviceName = injectableConfig.dependents[0];
                if (serviceName === undefined || serviceName === '') {
                    return null;
                }
                bindingsFilePath = `__internals__/domains/${injectableConfig.domain}/services/${serviceName}/repos/${repoName}/${repoName}.repo.inversify.bindings.ts`;
                setupFunctionName = `setup${kebabToPascalCase(repoName)}RepoBindings`;
            }
            else {
                if (injectableType === 'service:domain') {
                    if (('domain' in injectableConfig) === false) {
                        return null;
                    }
                    bindingsFilePath = `__internals__/domains/${injectableConfig.domain}/services/${injectableName}/${injectableName}.inversify.bindings.ts`;
                    setupFunctionName = `setup${kebabToPascalCase(injectableName)}Bindings`;
                }
                else {
                    if (injectableType === 'use-case:transactional' || injectableType === 'use-case:non-transactional') {
                        if (('domain' in injectableConfig) === false) {
                            return null;
                        }
                        const endpointId = injectableName.replace(/-use-case$/, '');
                        bindingsFilePath = `__internals__/domains/${injectableConfig.domain}/endpoints/${endpointId}/${endpointId}.inversify.bindings.ts`;
                        setupFunctionName = `setup${kebabToPascalCase(endpointId)}Bindings`;
                    }
                    else {
                        if (injectableType === 'service:app') {
                            bindingsFilePath = `__internals__/app-services/${injectableName}/${injectableName}.inversify.bindings.ts`;
                            setupFunctionName = `setup${kebabToPascalCase(injectableName)}Bindings`;
                        }
                        else {
                            return null;
                        }
                    }
                }
            }
        }
    }

    return {
        bindingsFilePath,
        setupFunctionName,
        dependencyBindingsImportPath,
        dependencySetupFunctionName,
    };
}
