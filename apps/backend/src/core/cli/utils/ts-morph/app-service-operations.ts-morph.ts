import path from 'path';
import { BACKEND_SRC_PATH } from '@/core/cli/utils/cli-constants';
import { createOptimizedProject, ensureImport, removeImport, removeStatementContaining } from '@/core/cli/utils/ts-morph/helpers.ts-morph';


export interface AddAppServiceToContainerParams {
    serviceNameKebabCase: string;
    serviceNamePascalCase: string;
}

export function addGlobalAppServiceToAppContainer(params: AddAppServiceToContainerParams): void {
    const { serviceNameKebabCase, serviceNamePascalCase } = params;

    const project = createOptimizedProject();
    const setupFunctionName = `setup${serviceNamePascalCase}Bindings`;
    const importPath = `@/__internals__/app-services/${serviceNameKebabCase}/${serviceNameKebabCase}.inversify.bindings`;
    const containerFilePath = path.join(BACKEND_SRC_PATH, 'core', 'containers', 'app-container.ts');
    const sourceFile = project.addSourceFileAtPath(containerFilePath);

    ensureImport(sourceFile, importPath, setupFunctionName);

    const appContainerClass = sourceFile.getClass('AppContainer');
    if (appContainerClass === undefined) {
        throw new Error('AppContainer class not found in app-container.ts');
    }

    const bindMethod = appContainerClass.getMethod('bindGlobalSingletonServices');
    if (bindMethod === undefined) {
        throw new Error('bindGlobalSingletonServices method not found in AppContainer');
    }

    if ((bindMethod.getBodyText() ?? '').includes(setupFunctionName) === false) {
        bindMethod.addStatements(`${setupFunctionName}(this);`);
    }

    sourceFile.saveSync();
}


export function addAppServiceToRequestContainer(params: AddAppServiceToContainerParams): void {
    const { serviceNameKebabCase, serviceNamePascalCase } = params;

    const project = createOptimizedProject();
    const setupFunctionName = `setup${serviceNamePascalCase}Bindings`;
    const importPath = `@/__internals__/app-services/${serviceNameKebabCase}/${serviceNameKebabCase}.inversify.bindings`;
    const containerFilePath = path.join(BACKEND_SRC_PATH, 'core', 'containers', 'request-container.ts');
    const sourceFile = project.addSourceFileAtPath(containerFilePath);

    ensureImport(sourceFile, importPath, setupFunctionName);

    const requestContainerClass = sourceFile.getClass('RequestContainer');
    if (requestContainerClass === undefined) {
        throw new Error('RequestContainer class not found in request-container.ts');
    }

    const bindMethod = requestContainerClass.getMethod('bindSharedRequestScopedServices');
    if (bindMethod === undefined) {
        throw new Error('bindSharedRequestScopedServices method not found in RequestContainer');
    }

    if ((bindMethod.getBodyText() ?? '').includes(setupFunctionName) === false) {
        bindMethod.addStatements(`${setupFunctionName}(this);`);
    }

    sourceFile.saveSync();
}


export function removeAppServiceFromRequestContainer(params: AddAppServiceToContainerParams): void {
    const { serviceNameKebabCase, serviceNamePascalCase } = params;

    const project = createOptimizedProject();
    const setupFunctionName = `setup${serviceNamePascalCase}Bindings`;
    const importPath = `@/__internals__/app-services/${serviceNameKebabCase}/${serviceNameKebabCase}.inversify.bindings`;
    const containerFilePath = path.join(BACKEND_SRC_PATH, 'core', 'containers', 'request-container.ts');
    const sourceFile = project.addSourceFileAtPath(containerFilePath);

    const requestContainerClass = sourceFile.getClass('RequestContainer');
    if (requestContainerClass === undefined) {
        throw new Error('RequestContainer class not found in request-container.ts');
    }

    const bindMethod = requestContainerClass.getMethod('bindSharedRequestScopedServices');
    if (bindMethod === undefined) {
        throw new Error('bindSharedRequestScopedServices method not found in RequestContainer');
    }

    removeStatementContaining(bindMethod, setupFunctionName);
    removeImport(sourceFile, importPath);

    sourceFile.saveSync();
}


export interface AddGlobalAppServiceBindingParams {
    serviceNameKebabCase: string;
    serviceNamePascalCase: string;
}

export function addGlobalAppServiceBinding(params: AddGlobalAppServiceBindingParams): void {
    const { serviceNameKebabCase, serviceNamePascalCase } = params;

    const project = createOptimizedProject();
    const setupFunctionName = `setup${serviceNamePascalCase}Bindings`;
    const importPath = `@/__internals__/app-services/${serviceNameKebabCase}/${serviceNameKebabCase}.inversify.bindings`;
    const appContainerPath = path.join(BACKEND_SRC_PATH, 'core', 'containers', 'app-container.ts');
    const sourceFile = project.addSourceFileAtPath(appContainerPath);

    ensureImport(sourceFile, importPath, setupFunctionName);

    const appContainerClass = sourceFile.getClass('AppContainer');
    if (appContainerClass === undefined) {
        throw new Error('AppContainer class not found in app-container.ts');
    }

    const bindMethod = appContainerClass.getMethod('bindGlobalSingletonServices');
    if (bindMethod === undefined) {
        throw new Error('bindGlobalSingletonServices method not found in AppContainer');
    }

    if ((bindMethod.getBodyText() ?? '').includes(setupFunctionName) === false) {
        bindMethod.addStatements(`${setupFunctionName}(this);`);
    }

    sourceFile.saveSync();
}


export interface RemoveGlobalAppServiceBindingParams {
    serviceNameKebabCase: string;
    serviceNamePascalCase: string;
}

export function removeGlobalAppServiceBinding(params: RemoveGlobalAppServiceBindingParams): void {
    const { serviceNameKebabCase, serviceNamePascalCase } = params;

    const project = createOptimizedProject();
    const appContainerPath = path.join(BACKEND_SRC_PATH, 'core', 'containers', 'app-container.ts');
    const sourceFile = project.addSourceFileAtPath(appContainerPath);

    const setupFunctionName = `setup${serviceNamePascalCase}Bindings`;
    const importPath = `@/__internals__/app-services/${serviceNameKebabCase}/${serviceNameKebabCase}.inversify.bindings`;

    removeImport(sourceFile, importPath);

    const appContainerClass = sourceFile.getClass('AppContainer');
    if (appContainerClass === undefined) {
        throw new Error('AppContainer class not found in app-container.ts');
    }

    const bindMethod = appContainerClass.getMethod('bindGlobalSingletonServices');
    if (bindMethod === undefined) {
        throw new Error('bindGlobalSingletonServices method not found in AppContainer');
    }

    removeStatementContaining(bindMethod, setupFunctionName);

    sourceFile.saveSync();
}
