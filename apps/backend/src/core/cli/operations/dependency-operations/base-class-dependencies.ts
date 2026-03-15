import * as p from '@clack/prompts';
import { kebabToPascalCase } from '@/core/cli/utils/case-converter';
import { addPropertyInjectionToBaseClass, removePropertyInjectionFromBaseClass } from '@/core/cli/utils/ts-morph/injectable-operations.ts-morph';
import { addAppServiceToRequestContainer, removeAppServiceFromRequestContainer } from '@/core/cli/utils/ts-morph/app-service-operations.ts-morph';
import { getAllInjectables, getInjectable, saveRegistry } from '@/core/cli/injectables-registry/injectables-registry.manager';
import { updateInjectableDependencies } from '@/core/cli/injectables-registry/injectables-registry.updater';
import { selectAction, handleUnexpectedError } from '@/core/cli/utils/ui-utils';
import { BASE_CLASS_IDS, ALLOWED_BASE_CLASS_IDS_FOR_DEPS } from '@/core/cli/utils/type-utils';
import { regenerateTestersForBaseClassDependents } from '@/core/cli/utils/tester-generator/tester-orchestrators';


export async function baseClassesMenu(): Promise<void> {
    while (true) {
        const action = await selectAction('Base Classes - What do you want to do?', [
            { value: 'add-dependency', label: 'Add dependency' },
            { value: 'remove-dependency', label: 'Remove dependency' },
        ]);

        if (action === null) {
            return;
        }

        switch (action) {
            case 'add-dependency':
                await addBaseClassDependency();
                break;
            case 'remove-dependency':
                await removeBaseClassDependency();
                break;
        }
    }
}

async function addBaseClassDependency(baseClassId?: string): Promise<void> {
    if (baseClassId === undefined) {
        const baseClassOptions = ALLOWED_BASE_CLASS_IDS_FOR_DEPS.map(id => {
            const label = id === BASE_CLASS_IDS.USE_CASE_BASE ? 'Use Case Base' :
                         id === BASE_CLASS_IDS.REPO_BASE ? 'Repo Base' :
                         'Domain Service Base';
            return { value: id, label };
        });

        const selected = await selectAction('Select base class to add dependency to:', baseClassOptions);
        if (selected === null) {
            return;
        }
        baseClassId = selected;
    }

    const baseClassConfig = getInjectable(baseClassId);
    if (baseClassConfig === undefined) {
        p.log.error(`Base class "${baseClassId}" not found in registry.`);
        return;
    }

    const allInjectables = getAllInjectables();
    const appServices: string[] = [];

    for (const [injectableName, injectableConfig] of Object.entries(allInjectables)) {
        if (injectableConfig.type === 'service:app') {
            appServices.push(injectableName);
        }
    }

    if (appServices.length === 0) {
        p.log.info('No app services found. Create one first.');
        return;
    }

    const currentDeps = 'dependencies' in baseClassConfig ? baseClassConfig.dependencies : [];

    const availableAppServices = appServices.filter(serviceName => {
        if (currentDeps.includes(serviceName) === true) {
            return false;
        }
        return true;
    });

    if (availableAppServices.length === 0) {
        p.log.info('No app services available to add.');
        if (currentDeps.length > 0) {
            p.log.info(`Current dependencies: ${currentDeps.join(', ')}`);
        }
        return;
    }

    const appServicesWithScope = availableAppServices.map(serviceName => {
        const serviceConfig = allInjectables[serviceName];
        const scope = serviceConfig !== undefined && 'isGlobal' in serviceConfig
            ? (serviceConfig.isGlobal ? 'global' : 'request-scoped')
            : 'unknown';
        return { name: serviceName, scope };
    });

    appServicesWithScope.sort((a, b) => a.name.localeCompare(b.name));

    const dependencyName = await selectAction('Select app service to add:', appServicesWithScope.map(svc => ({
        value: svc.name,
        label: `${svc.name} (${svc.scope})`,
    })));
    if (dependencyName === null) {
        return;
    }

    const appServiceConfig = allInjectables[dependencyName];
    if (appServiceConfig !== undefined && 'dependents' in appServiceConfig) {
        const conflicts: string[] = [];

        let childTypes: string[] = [];
        if (baseClassId === BASE_CLASS_IDS.USE_CASE_BASE) {
            childTypes = ['use-case:transactional', 'use-case:non-transactional'];
        }
        else {
            if (baseClassId === BASE_CLASS_IDS.REPO_BASE) {
                childTypes = ['repo:endpoint:transactional', 'repo:endpoint:non-transactional', 'repo:domain:transactional', 'repo:domain:non-transactional'];
            }
            else {
                if (baseClassId === BASE_CLASS_IDS.DOMAIN_SERVICE_BASE) {
                    childTypes = ['service:domain'];
                }
            }
        }

        for (const dependentName of appServiceConfig.dependents) {
            const dependentConfig = allInjectables[dependentName];
            if (dependentConfig !== undefined && childTypes.includes(dependentConfig.type)) {
                conflicts.push(dependentName);
            }
        }

        if (conflicts.length > 0) {
            p.log.error(`Cannot add "${dependencyName}" to base class because the following injectables already have it:`);
            for (const conflict of conflicts) {
                p.log.step(`- ${conflict}`);
            }
            p.log.info('Remove this dependency from each child injectable first, then try again.');
            return;
        }
    }

    const updatedDeps = [...currentDeps, dependencyName];
    updateInjectableDependencies(baseClassId, updatedDeps);
    saveRegistry();


    try {
        addPropertyInjectionToBaseClass({
            baseClassId,
            appServiceNameKebabCase: dependencyName,
        });
    }
    catch (error) {
        p.log.error(`Failed to add property injection to base class file: ${error}`);
        handleUnexpectedError();
    }

    if (appServiceConfig !== undefined && 'isGlobal' in appServiceConfig && appServiceConfig.isGlobal === false) {
        try {
            const dependencyNamePascalCase = kebabToPascalCase(dependencyName);
            addAppServiceToRequestContainer({
                serviceNameKebabCase: dependencyName,
                serviceNamePascalCase: dependencyNamePascalCase,
            });
        }
        catch (error) {
            p.log.error(`Failed to add binding to request-container.ts: ${error}`);
            handleUnexpectedError();
        }
    }

    regenerateTestersForBaseClassDependents(baseClassId);
}

async function removeBaseClassDependency(baseClassId?: string): Promise<void> {
    if (baseClassId === undefined) {
        const baseClassOptions = ALLOWED_BASE_CLASS_IDS_FOR_DEPS.map(id => {
            const label = id === BASE_CLASS_IDS.USE_CASE_BASE ? 'Use Case Base' :
                         id === BASE_CLASS_IDS.REPO_BASE ? 'Repo Base' :
                         'Domain Service Base';
            return { value: id, label };
        });

        const selected = await selectAction('Select base class to remove dependency from:', baseClassOptions);
        if (selected === null) {
            return;
        }
        baseClassId = selected;
    }

    const baseClassConfig = getInjectable(baseClassId);
    if (baseClassConfig === undefined) {
        p.log.error(`Base class "${baseClassId}" not found in registry.`);
        return;
    }

    if (('dependencies' in baseClassConfig) === false) {
        p.log.error(`Base class "${baseClassId}" does not support dependencies.`);
        return;
    }

    const currentDeps = baseClassConfig.dependencies;

    if (currentDeps.length === 0) {
        p.log.info('No dependencies to remove.');
        return;
    }

    const allInjectables = getAllInjectables();

    const removableDeps = currentDeps.filter(dep => {
        const depConfig = allInjectables[dep];
        return depConfig !== undefined && depConfig.type === 'service:app';
    });

    if (removableDeps.length === 0) {
        p.log.info('No removable dependencies found. Only app services can be removed from base classes.');
        return;
    }
    const depsWithScope = removableDeps.map(depName => {
        const depConfig = allInjectables[depName];
        const scope = depConfig !== undefined && 'isGlobal' in depConfig
            ? (depConfig.isGlobal ? 'global' : 'request-scoped')
            : 'unknown';
        return { name: depName, scope };
    });

    depsWithScope.sort((a, b) => a.name.localeCompare(b.name));

    const dependencyName = await selectAction('Select dependency to remove:', depsWithScope.map(dep => ({
        value: dep.name,
        label: `${dep.name} (${dep.scope})`,
    })));
    if (dependencyName === null) {
        return;
    }

    const updatedDeps = currentDeps.filter(d => d !== dependencyName);
    updateInjectableDependencies(baseClassId, updatedDeps);
    saveRegistry();


    try {
        removePropertyInjectionFromBaseClass({
            baseClassId,
            appServiceNameKebabCase: dependencyName,
        });
    }
    catch (error) {
        p.log.error(`Failed to remove property injection from base class file: ${error}`);
        handleUnexpectedError();
    }

    const appServiceConfig = allInjectables[dependencyName];
    if (appServiceConfig !== undefined && 'isGlobal' in appServiceConfig && appServiceConfig.isGlobal === false) {
        const baseClassIds = Object.values(BASE_CLASS_IDS);
        let stillUsedByOtherBase = false;

        for (const otherBaseId of baseClassIds) {
            if (otherBaseId === baseClassId) {
                continue;
            }
            const otherBaseConfig = getInjectable(otherBaseId);
            if (otherBaseConfig !== undefined && 'dependencies' in otherBaseConfig) {
                if (otherBaseConfig.dependencies.includes(dependencyName)) {
                    stillUsedByOtherBase = true;
                    break;
                }
            }
        }

        if (stillUsedByOtherBase === false) {
            try {
                const dependencyNamePascalCase = kebabToPascalCase(dependencyName);
                removeAppServiceFromRequestContainer({
                    serviceNameKebabCase: dependencyName,
                    serviceNamePascalCase: dependencyNamePascalCase,
                });
            }
            catch (error) {
                p.log.error(`Failed to remove binding from request-container.ts: ${error}`);
                handleUnexpectedError();
            }
        }
    }

    regenerateTestersForBaseClassDependents(baseClassId);
}
