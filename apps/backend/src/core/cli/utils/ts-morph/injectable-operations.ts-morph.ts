import path from 'path';
import { kebabToCamelCase, kebabToPascalCase } from '@/core/cli/utils/case-converter';
import { BACKEND_SRC_PATH } from '@/core/cli/utils/cli-constants';
import { createOptimizedProject, ensureImport, addInjectedProperty } from '@/core/cli/utils/ts-morph/helpers.ts-morph';
import { getInjectable } from '@/core/cli/injectables-registry/injectables-registry.manager';
import { getInjectableTypeName } from '@/core/cli/injectables-registry/injectables-registry.helpers';


function getBaseClassFilePath(baseClassId: string): string {
    const baseClassPaths: Record<string, string> = {
        'use-case-base': path.join(BACKEND_SRC_PATH, 'core', 'base-classes', 'use-case', 'use-case.base.ts'),
        'transactional-use-case-base': path.join(BACKEND_SRC_PATH, 'core', 'base-classes', 'use-case', 'transactional-use-case.base.ts'),
        'non-transactional-use-case-base': path.join(BACKEND_SRC_PATH, 'core', 'base-classes', 'use-case', 'non-transactional-use-case.base.ts'),
        'repo-base': path.join(BACKEND_SRC_PATH, 'core', 'base-classes', 'repo', 'repo.base.ts'),
        'transactional-repo-base': path.join(BACKEND_SRC_PATH, 'core', 'base-classes', 'repo', 'transactional-repo.base.ts'),
        'non-transactional-repo-base': path.join(BACKEND_SRC_PATH, 'core', 'base-classes', 'repo', 'non-transactional-repo.base.ts'),
        'domain-repo-base': path.join(BACKEND_SRC_PATH, 'core', 'base-classes', 'repo', 'domain-repo.base.ts'),
        'domain-service-base': path.join(BACKEND_SRC_PATH, 'core', 'base-classes', 'domain-service', 'domain-service.base.ts'),
    };

    const filePath = baseClassPaths[baseClassId];
    if (filePath === undefined) {
        throw new Error(`Unknown base class ID: ${baseClassId}`);
    }
    return filePath;
}


export interface AddGenericDependencyParams {
    injectableFilePath: string;
    dependencyNameKebabCase: string;
    dependencyNamePascalCase: string;
    dependencyNameCamelCase: string;
    dependencyType: 'repo' | 'service';
}

export function addGenericDependency(params: AddGenericDependencyParams): void {
    const { injectableFilePath, dependencyNameKebabCase, dependencyNamePascalCase, dependencyNameCamelCase, dependencyType } = params;

    const project = createOptimizedProject();
    const sourceFile = project.addSourceFileAtPath(injectableFilePath);

    const suffix = dependencyType === 'repo' ? 'Repo' : '';
    const decoratorName = `inject${dependencyNamePascalCase}${suffix}`;
    const interfaceName = `I${dependencyNamePascalCase}${suffix}`;
    const importPath = `@/__internals__/${dependencyNameKebabCase}/${dependencyNameKebabCase}.inversify.tokens`;
    const interfaceImportPath = `@/${dependencyNameKebabCase}/${dependencyNameKebabCase}.interface`;

    ensureImport(sourceFile, importPath, decoratorName);
    ensureImport(sourceFile, interfaceImportPath, interfaceName, true);

    const classes = sourceFile.getClasses();
    if (classes.length === 0) {
        throw new Error(`No class found in ${injectableFilePath}`);
    }
    const targetClass = classes[0];

    addInjectedProperty({
        targetClass,
        sourceFile,
        decoratorName,
        propertyName: `${dependencyNameCamelCase}${suffix}`,
        typeName: interfaceName,
        scope: 'private',
    });

    sourceFile.saveSync();
}


export interface AddPropertyInjectionToBaseClassParams {
    baseClassId: string;
    appServiceNameKebabCase: string;
}

export function addPropertyInjectionToBaseClass(params: AddPropertyInjectionToBaseClassParams): void {
    const { baseClassId, appServiceNameKebabCase } = params;

    const project = createOptimizedProject();
    const baseClassFilePath = getBaseClassFilePath(baseClassId);
    const sourceFile = project.addSourceFileAtPath(baseClassFilePath);

    const classes = sourceFile.getClasses();
    if (classes.length === 0) {
        throw new Error(`No class found in ${baseClassFilePath}`);
    }
    const targetClass = classes[0];

    const appServiceNameCamelCase = kebabToCamelCase(appServiceNameKebabCase);
    const appServiceNamePascalCase = kebabToPascalCase(appServiceNameKebabCase);

    const interfaceName = `I${appServiceNamePascalCase}`;
    const decoratorName = `inject${appServiceNamePascalCase}`;

    const interfaceImportPath = `@/app-services/${appServiceNameKebabCase}/${appServiceNameKebabCase}.interface`;
    const tokenImportPath = `@/__internals__/app-services/${appServiceNameKebabCase}/${appServiceNameKebabCase}.inversify.tokens`;

    ensureImport(sourceFile, interfaceImportPath, interfaceName, true);
    ensureImport(sourceFile, tokenImportPath, decoratorName);

    const existingProperty = targetClass.getProperty(appServiceNameCamelCase);
    if (existingProperty !== undefined) {
        return;
    }

    addInjectedProperty({
        targetClass,
        sourceFile,
        decoratorName,
        propertyName: appServiceNameCamelCase,
        typeName: interfaceName,
        scope: 'protected',
    });

    sourceFile.saveSync();
}


export interface RemovePropertyInjectionFromBaseClassParams {
    baseClassId: string;
    appServiceNameKebabCase: string;
}

export function removePropertyInjectionFromBaseClass(params: RemovePropertyInjectionFromBaseClassParams): void {
    const { baseClassId, appServiceNameKebabCase } = params;

    const project = createOptimizedProject();
    const baseClassFilePath = getBaseClassFilePath(baseClassId);
    const sourceFile = project.addSourceFileAtPath(baseClassFilePath);

    const classes = sourceFile.getClasses();
    if (classes.length === 0) {
        throw new Error(`No class found in ${baseClassFilePath}`);
    }
    const targetClass = classes[0];

    const appServiceNameCamelCase = kebabToCamelCase(appServiceNameKebabCase);
    const appServiceNamePascalCase = kebabToPascalCase(appServiceNameKebabCase);

    const property = targetClass.getProperty(appServiceNameCamelCase);
    if (property === undefined) {
        return;
    }

    property.remove();

    const interfaceName = `I${appServiceNamePascalCase}`;
    const decoratorName = `inject${appServiceNamePascalCase}`;
    const interfaceImportPath = `@/app-services/${appServiceNameKebabCase}/${appServiceNameKebabCase}.interface`;
    const tokenImportPath = `@/__internals__/app-services/${appServiceNameKebabCase}/${appServiceNameKebabCase}.inversify.tokens`;

    const interfaceImport = sourceFile.getImportDeclaration(interfaceImportPath);
    if (interfaceImport !== undefined) {
        const namedImports = interfaceImport.getNamedImports();
        const importToRemove = namedImports.find(ni => ni.getName() === interfaceName);
        if (importToRemove !== undefined) {
            importToRemove.remove();
            if (interfaceImport.getNamedImports().length === 0) {
                interfaceImport.remove();
            }
        }
    }

    const tokenImport = sourceFile.getImportDeclaration(tokenImportPath);
    if (tokenImport !== undefined) {
        const namedImports = tokenImport.getNamedImports();
        const importToRemove = namedImports.find(ni => ni.getName() === decoratorName);
        if (importToRemove !== undefined) {
            importToRemove.remove();
            if (tokenImport.getNamedImports().length === 0) {
                tokenImport.remove();
            }
        }
    }

    sourceFile.saveSync();
}


export interface AddPropertyInjectionToInjectableParams {
    injectableFilePath: string;
    dependencyName: string;
    dependencyImportPath: string;
    dependencyInterfacePath: string;
}

export function addPropertyInjectionToInjectable(params: AddPropertyInjectionToInjectableParams): void {
    const { injectableFilePath, dependencyName, dependencyImportPath, dependencyInterfacePath } = params;

    const project = createOptimizedProject();
    const sourceFile = project.addSourceFileAtPath(injectableFilePath);

    const classes = sourceFile.getClasses();
    if (classes.length === 0) {
        throw new Error(`No class found in ${injectableFilePath}`);
    }
    const targetClass = classes[0];

    const dependencyNameCamelCase = kebabToCamelCase(dependencyName);
    const dependencyNamePascalCase = kebabToPascalCase(dependencyName);

    const dependencyConfig = getInjectable(dependencyName);
    if (dependencyConfig === undefined) {
        throw new Error(`Dependency "${dependencyName}" not found in registry`);
    }

    const decoratorName = `inject${dependencyNamePascalCase}`;
    const interfaceName = getInjectableTypeName(dependencyName, dependencyConfig);
    const propertyName = dependencyNameCamelCase;

    ensureImport(sourceFile, dependencyInterfacePath, interfaceName, true);
    ensureImport(sourceFile, dependencyImportPath, decoratorName);

    const existingProperty = targetClass.getProperty(propertyName);
    if (existingProperty !== undefined) {
        return;
    }

    addInjectedProperty({
        targetClass,
        sourceFile,
        decoratorName,
        propertyName,
        typeName: interfaceName,
        scope: 'private',
    });

    sourceFile.saveSync();
}


export interface RemovePropertyInjectionFromInjectableParams {
    injectableFilePath: string;
    dependencyName: string;
    dependencyImportPath: string;
    dependencyInterfacePath: string;
}

export function removePropertyInjectionFromInjectable(params: RemovePropertyInjectionFromInjectableParams): void {
    const { injectableFilePath, dependencyName, dependencyImportPath, dependencyInterfacePath } = params;

    const project = createOptimizedProject();
    const sourceFile = project.addSourceFileAtPath(injectableFilePath);

    const classes = sourceFile.getClasses();
    if (classes.length === 0) {
        throw new Error(`No class found in ${injectableFilePath}`);
    }
    const targetClass = classes[0];

    const dependencyNameCamelCase = kebabToCamelCase(dependencyName);
    const dependencyNamePascalCase = kebabToPascalCase(dependencyName);

    const propertyName = dependencyNameCamelCase;

    const property = targetClass.getProperty(propertyName);
    if (property === undefined) {
        return;
    }

    property.remove();

    const dependencyConfig = getInjectable(dependencyName);
    if (dependencyConfig === undefined) {
        throw new Error(`Dependency "${dependencyName}" not found in registry`);
    }

    const decoratorName = `inject${dependencyNamePascalCase}`;
    const interfaceName = getInjectableTypeName(dependencyName, dependencyConfig);

    const interfaceImport = sourceFile.getImportDeclaration(dependencyInterfacePath);
    if (interfaceImport !== undefined) {
        const namedImports = interfaceImport.getNamedImports();
        const importToRemove = namedImports.find(ni => ni.getName() === interfaceName);
        if (importToRemove !== undefined) {
            importToRemove.remove();
            if (interfaceImport.getNamedImports().length === 0) {
                interfaceImport.remove();
            }
        }
    }

    const tokenImport = sourceFile.getImportDeclaration(dependencyImportPath);
    if (tokenImport !== undefined) {
        const namedImports = tokenImport.getNamedImports();
        const importToRemove = namedImports.find(ni => ni.getName() === decoratorName);
        if (importToRemove !== undefined) {
            importToRemove.remove();
            if (tokenImport.getNamedImports().length === 0) {
                tokenImport.remove();
            }
        }
    }

    sourceFile.saveSync();
}
