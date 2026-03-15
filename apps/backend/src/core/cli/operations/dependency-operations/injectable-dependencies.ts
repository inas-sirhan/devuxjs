import path from 'path';
import * as p from '@clack/prompts';
import { addPropertyInjectionToInjectable, removePropertyInjectionFromInjectable } from '@/core/cli/utils/ts-morph/injectable-operations.ts-morph';
import { addDependencyBindingsCall, removeDependencyBindingsCall } from '@/core/cli/utils/ts-morph/domain-service-operations.ts-morph';
import { getAllInjectables, getInjectable, saveRegistry } from '@/core/cli/injectables-registry/injectables-registry.manager';
import { getLocation, getTokensImportPath, getTypeImportPath } from '@/core/cli/injectables-registry/injectables-registry.helpers';
import { updateInjectableDependencies } from '@/core/cli/injectables-registry/injectables-registry.updater';
import { selectAction, handleUnexpectedError } from '@/core/cli/utils/ui-utils';
import { getDependenciesFromBaseClasses } from '@/core/cli/utils/type-utils';
import { generateTesterForInjectable, regenerateTestersForDependents } from '@/core/cli/utils/tester-generator/tester-orchestrators';
import { shouldAddDependencyBindingsCall, getDependencyBindingsCallInfo } from '@/core/cli/utils/dependency-utils';
import { BACKEND_SRC_PATH } from '@/core/cli/utils/cli-constants';


export async function addInjectableDependency(injectableName: string): Promise<void> {
    const injectableConfig = getInjectable(injectableName);
    if (injectableConfig === undefined) {
        p.log.error(`Injectable "${injectableName}" not found in registry.`);
        return;
    }

    if (('dependencies' in injectableConfig) === false) {
        p.log.error(`Injectable "${injectableName}" does not support dependencies.`);
        return;
    }

    const baseClassDeps = getDependenciesFromBaseClasses(injectableConfig);

    const allInjectables = getAllInjectables();
    const availableDeps: { name: string; type: string }[] = [];

    const injectableType = injectableConfig.type;

    for (const [depName, depConfig] of Object.entries(allInjectables)) {
        if (injectableConfig.dependencies.includes(depName)) {
            continue;
        }

        if (baseClassDeps.includes(depName) === true) {
            continue;
        }

        if (depName === injectableName) {
            continue;
        }

        const depType = depConfig.type;

        let allowed = false;

        if (injectableType === 'use-case:transactional') {
            allowed = depType === 'repo:domain:transactional' ||
                      depType === 'service:domain' ||
                      depType === 'service:app';
        }
        else {
            if (injectableType === 'use-case:non-transactional') {
                allowed = depType === 'repo:domain:non-transactional' ||
                          depType === 'service:app';
            }
            else {
                if (injectableType === 'repo:endpoint:transactional' ||
                           injectableType === 'repo:endpoint:non-transactional' ||
                           injectableType === 'repo:domain:transactional' ||
                           injectableType === 'repo:domain:non-transactional' ||
                           injectableType === 'repo:service:domain') {
                    allowed = depType === 'service:app';
                }
                else {
                    if (injectableType === 'service:domain') {
                        allowed = depType === 'repo:domain:transactional' || depType === 'service:domain' || depType === 'service:app';
                    }
                    else {
                        if (injectableType === 'service:app') {
                            const isInjectableGlobal = injectableConfig.isGlobal;

                            if (depType === 'service:app') {
                                const isDependencyGlobal = depConfig.isGlobal;

                                if (isInjectableGlobal === true && isDependencyGlobal === false) {
                                    allowed = false;
                                }
                                else {
                                    allowed = true;
                                }
                            }
                            else {
                                if (depType === 'service:core') {
                                    const isPublic = 'isPublic' in depConfig ? depConfig.isPublic : false;

                                    if (isPublic !== true) {
                                        allowed = false;
                                    }
                                    else {
                                        const isCoreServiceGlobal = depConfig.isGlobal;

                                        if (isInjectableGlobal === true && isCoreServiceGlobal === false) {
                                            allowed = false;
                                        }
                                        else {
                                            allowed = true;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        if (allowed === true) {
            availableDeps.push({ name: depName, type: depType });
        }
    }

    if (availableDeps.length === 0) {
        p.log.info('No dependencies available to add (all already added or none compatible).');
        if (baseClassDeps.length > 0) {
            p.log.info(`Note: ${baseClassDeps.length} dependency(ies) already available via base class: ${baseClassDeps.join(', ')}`);
        }
        return;
    }

    const groupedDeps = new Map<string, { name: string; type: string; scope: string | undefined }[]>();

    for (const dep of availableDeps) {
        const depConfig = allInjectables[dep.name];
        const groupKey = dep.type;
        const displayData: { name: string; type: string; scope: string | undefined } = { name: dep.name, type: dep.type, scope: undefined };

        if ((dep.type === 'service:app' || dep.type === 'service:core') && depConfig !== undefined && 'isGlobal' in depConfig) {
            displayData.scope = depConfig.isGlobal ? 'global' : 'request-scoped';
        }

        if (groupedDeps.has(groupKey) === false) {
            groupedDeps.set(groupKey, []);
        }
        groupedDeps.get(groupKey)!.push(displayData);
    }

    const groupOptions: { value: string; label: string; hint: string }[] = [];

    for (const [groupKey, items] of groupedDeps.entries()) {
        let label = '';
        switch (groupKey) {
            case 'repo:endpoint:transactional':
                label = 'Endpoint Repos (Transactional)';
                break;
            case 'repo:endpoint:non-transactional':
                label = 'Endpoint Repos (Non-Transactional)';
                break;
            case 'repo:domain:transactional':
                label = 'Domain Repos (Transactional)';
                break;
            case 'repo:domain:non-transactional':
                label = 'Domain Repos (Non-Transactional)';
                break;
            case 'service:domain':
                label = 'Domain Services';
                break;
            case 'service:app':
                label = 'App Services';
                break;
            case 'service:core':
                label = 'Core Services';
                break;
            default:
                label = groupKey;
        }

        groupOptions.push({
            value: groupKey,
            label,
            hint: `${items.length} available`,
        });
    }

    const selectedGroup = await selectAction('Select dependency type:', groupOptions);
    if (selectedGroup === null) {
        return;
    }

    const depsInGroup = groupedDeps.get(selectedGroup)!;

    depsInGroup.sort((a, b) => a.name.localeCompare(b.name));

    const dependencyName = await selectAction('Select a dependency to add:', depsInGroup.map(d => ({
        value: d.name,
        label: d.name,
        hint: d.scope !== undefined ? `[${d.scope}]` : '',
    })));
    if (dependencyName === null) {
        return;
    }

    const updatedDeps = [...injectableConfig.dependencies, dependencyName];
    updateInjectableDependencies(injectableName, updatedDeps);
    saveRegistry();


    try {
        const dependencyConfig = allInjectables[dependencyName];
        if (dependencyConfig === undefined) {
            throw new Error(`Dependency "${dependencyName}" not found in registry`);
        }

        const injectableLocation = getLocation(injectableName, injectableConfig);
        const injectableFilePath = path.join(BACKEND_SRC_PATH, `${injectableLocation}.ts`);

        const dependencyLocation = getLocation(dependencyName, dependencyConfig);
        const dependencyImportPath = getTokensImportPath(dependencyLocation, dependencyConfig.isCore);
        const dependencyInterfacePath = getTypeImportPath(dependencyLocation, dependencyConfig);

        addPropertyInjectionToInjectable({
            injectableFilePath,
            dependencyName,
            dependencyImportPath,
            dependencyInterfacePath,
        });

        const needsBindingsCall = shouldAddDependencyBindingsCall(injectableConfig, dependencyConfig);
        if (needsBindingsCall === true) {
            const bindingsInfo = getDependencyBindingsCallInfo(injectableName, injectableConfig, dependencyName, dependencyConfig);
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
    catch (error) {
        p.log.error(`Failed to add property injection to injectable file: ${error}`);
        handleUnexpectedError();
    }

    generateTesterForInjectable(injectableName);

    regenerateTestersForDependents(injectableName);
}


export async function removeInjectableDependency(injectableName: string): Promise<void> {
    const injectableConfig = getInjectable(injectableName);
    if (injectableConfig === undefined) {
        p.log.error(`Injectable "${injectableName}" not found in registry.`);
        return;
    }

    if (('dependencies' in injectableConfig) === false) {
        p.log.error(`Injectable "${injectableName}" does not support dependencies.`);
        return;
    }

    const baseClassDeps = getDependenciesFromBaseClasses(injectableConfig);

    const currentDeps = injectableConfig.dependencies.filter(dep => baseClassDeps.includes(dep) === false);

    if (currentDeps.length === 0) {
        p.log.info('No dependencies to remove.');
        if (baseClassDeps.length > 0) {
            p.log.info(`Note: ${baseClassDeps.length} dependency(ies) inherited from base class cannot be removed here: ${baseClassDeps.join(', ')}`);
        }
        return;
    }

    const allInjectables = getAllInjectables();
    const depOptions = currentDeps.map(dep => {
        const depType = allInjectables[dep]?.type;
        return {
            value: dep,
            label: dep,
            hint: depType !== undefined ? depType : '',
        };
    });

    depOptions.sort((a, b) => a.label.localeCompare(b.label));

    const dependencyName = await selectAction('Select a dependency to remove:', depOptions);
    if (dependencyName === null) {
        return;
    }

    const updatedDeps = injectableConfig.dependencies.filter(d => d !== dependencyName);
    updateInjectableDependencies(injectableName, updatedDeps);
    saveRegistry();


    try {
        const dependencyConfig = allInjectables[dependencyName];
        if (dependencyConfig === undefined) {
            throw new Error(`Dependency "${dependencyName}" not found in registry`);
        }

        const injectableLocation = getLocation(injectableName, injectableConfig);
        const injectableFilePath = path.join(BACKEND_SRC_PATH, `${injectableLocation}.ts`);

        const dependencyLocation = getLocation(dependencyName, dependencyConfig);
        const dependencyImportPath = getTokensImportPath(dependencyLocation, dependencyConfig.isCore);
        const dependencyInterfacePath = getTypeImportPath(dependencyLocation, dependencyConfig);

        removePropertyInjectionFromInjectable({
            injectableFilePath,
            dependencyName,
            dependencyImportPath,
            dependencyInterfacePath,
        });

        if (shouldAddDependencyBindingsCall(injectableConfig, dependencyConfig)) {
            const bindingsInfo = getDependencyBindingsCallInfo(injectableName, injectableConfig, dependencyName, dependencyConfig);
            if (bindingsInfo !== null) {
                try {
                    removeDependencyBindingsCall({
                        bindingsFilePath: path.join(BACKEND_SRC_PATH, bindingsInfo.bindingsFilePath),
                        setupFunctionName: bindingsInfo.setupFunctionName,
                        dependencyBindingsImportPath: bindingsInfo.dependencyBindingsImportPath,
                        dependencySetupFunctionName: bindingsInfo.dependencySetupFunctionName,
                    });
                }
                catch (error) {
                    p.log.error(`Failed to remove bindings call: ${error}`);
                    handleUnexpectedError();
                }
            }
        }
    }
    catch (error) {
        p.log.error(`Failed to remove property injection from injectable file: ${error}`);
        handleUnexpectedError();
    }

    generateTesterForInjectable(injectableName);

    regenerateTestersForDependents(injectableName);
}
