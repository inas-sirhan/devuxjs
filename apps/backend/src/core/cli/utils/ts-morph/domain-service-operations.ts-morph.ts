import path from 'path';
import { BACKEND_SRC_PATH } from '@/core/cli/utils/cli-constants';
import { createOptimizedProject, ensureImport, removeImport, addInjectedProperty, removePropertyByDecorator, removeStatementContaining } from '@/core/cli/utils/ts-morph/helpers.ts-morph';


export interface AddRepoBindingsCallToServiceParams {
    domainNameKebabCase: string;
    serviceNameKebabCase: string;
    serviceNamePascalCase: string;
    repoNameKebabCase: string;
    repoNamePascalCase: string;
}

export function addRepoBindingsCallToService(params: AddRepoBindingsCallToServiceParams): void {
    const { domainNameKebabCase, serviceNameKebabCase, serviceNamePascalCase, repoNameKebabCase, repoNamePascalCase } = params;

    const project = createOptimizedProject();
    const internalsPath = path.join(BACKEND_SRC_PATH, '__internals__', 'domains', domainNameKebabCase, 'services', serviceNameKebabCase);
    const bindingsFilePath = path.join(internalsPath, `${serviceNameKebabCase}.inversify.bindings.ts`);
    const bindingsFile = project.addSourceFileAtPath(bindingsFilePath);

    const setupFunctionName = `setup${repoNamePascalCase}RepoBindings`;
    bindingsFile.addImportDeclaration({
        moduleSpecifier: `@/__internals__/domains/${domainNameKebabCase}/services/${serviceNameKebabCase}/repos/${repoNameKebabCase}/${repoNameKebabCase}.repo.inversify.bindings`,
        namedImports: [setupFunctionName],
    });

    const setupFunction = bindingsFile.getFunction(`setup${serviceNamePascalCase}Bindings`);
    if (setupFunction !== undefined) {
        setupFunction.addStatements(`${setupFunctionName}(requestContainer);`);
    }

    bindingsFile.saveSync();
}


export interface RemoveRepoBindingsCallFromServiceParams {
    domainNameKebabCase: string;
    serviceNameKebabCase: string;
    serviceNamePascalCase: string;
    repoNameKebabCase: string;
    repoNamePascalCase: string;
}

export function removeRepoBindingsCallFromService(params: RemoveRepoBindingsCallFromServiceParams): void {
    const { domainNameKebabCase, serviceNameKebabCase, serviceNamePascalCase, repoNameKebabCase, repoNamePascalCase } = params;

    const project = createOptimizedProject();
    const internalsPath = path.join(BACKEND_SRC_PATH, '__internals__', 'domains', domainNameKebabCase, 'services', serviceNameKebabCase);
    const bindingsFilePath = path.join(internalsPath, `${serviceNameKebabCase}.inversify.bindings.ts`);
    const bindingsFile = project.addSourceFileAtPath(bindingsFilePath);

    const setupFunctionName = `setup${repoNamePascalCase}RepoBindings`;
    const repoBindingsImportPath = `@/__internals__/domains/${domainNameKebabCase}/services/${serviceNameKebabCase}/repos/${repoNameKebabCase}/${repoNameKebabCase}.repo.inversify.bindings`;
    removeImport(bindingsFile, repoBindingsImportPath);

    const setupFunction = bindingsFile.getFunction(`setup${serviceNamePascalCase}Bindings`);
    if (setupFunction !== undefined) {
        removeStatementContaining(setupFunction, setupFunctionName);
    }

    bindingsFile.saveSync();
}


export interface AddRepoToDomainServiceParams {
    domainNameKebabCase: string;
    serviceNameKebabCase: string;
    serviceNamePascalCase: string;
    repoNameKebabCase: string;
    repoNamePascalCase: string;
    repoNameCamelCase: string;
}

export function addRepoToDomainService(params: AddRepoToDomainServiceParams): void {
    const { domainNameKebabCase, serviceNameKebabCase, serviceNamePascalCase, repoNameKebabCase, repoNamePascalCase, repoNameCamelCase } = params;

    const project = createOptimizedProject();
    const servicePath = path.join(BACKEND_SRC_PATH, 'domains', domainNameKebabCase, 'services', serviceNameKebabCase, `${serviceNameKebabCase}.ts`);
    const sourceFile = project.addSourceFileAtPath(servicePath);

    const tokensImportPath = `@/__internals__/domains/${domainNameKebabCase}/services/${serviceNameKebabCase}/repos/${repoNameKebabCase}/${repoNameKebabCase}.repo.inversify.tokens`;
    const repoInterfaceImportPath = `@/__internals__/domains/${domainNameKebabCase}/services/${serviceNameKebabCase}/repos/${repoNameKebabCase}/${repoNameKebabCase}.repo.interface`;

    ensureImport(sourceFile, tokensImportPath, `inject${repoNamePascalCase}Repo`);
    ensureImport(sourceFile, repoInterfaceImportPath, `I${repoNamePascalCase}Repo`, true);

    const serviceClass = sourceFile.getClass(serviceNamePascalCase);
    if (serviceClass !== undefined) {
        addInjectedProperty({
            targetClass: serviceClass,
            sourceFile,
            decoratorName: `inject${repoNamePascalCase}Repo`,
            propertyName: `${repoNameCamelCase}Repo`,
            typeName: `I${repoNamePascalCase}Repo`,
            scope: 'private',
        });
    }

    sourceFile.saveSync();
}


export interface RemoveRepoFromDomainServiceParams {
    domainNameKebabCase: string;
    serviceNameKebabCase: string;
    serviceNamePascalCase: string;
    repoNameKebabCase: string;
    repoNamePascalCase: string;
}

export function removeRepoFromDomainService(params: RemoveRepoFromDomainServiceParams): void {
    const { domainNameKebabCase, serviceNameKebabCase, serviceNamePascalCase, repoNameKebabCase, repoNamePascalCase } = params;

    const project = createOptimizedProject();
    const servicePath = path.join(BACKEND_SRC_PATH, 'domains', domainNameKebabCase, 'services', serviceNameKebabCase, `${serviceNameKebabCase}.ts`);
    const sourceFile = project.addSourceFileAtPath(servicePath);

    const tokensImportPath = `@/__internals__/domains/${domainNameKebabCase}/services/${serviceNameKebabCase}/repos/${repoNameKebabCase}/${repoNameKebabCase}.repo.inversify.tokens`;
    const repoInterfaceImportPath = `@/__internals__/domains/${domainNameKebabCase}/services/${serviceNameKebabCase}/repos/${repoNameKebabCase}/${repoNameKebabCase}.repo.interface`;

    removeImport(sourceFile, tokensImportPath);
    removeImport(sourceFile, repoInterfaceImportPath);

    const serviceClass = sourceFile.getClass(serviceNamePascalCase);
    if (serviceClass !== undefined) {
        removePropertyByDecorator(serviceClass, `inject${repoNamePascalCase}Repo`);
    }

    sourceFile.saveSync();
}


export interface AddDependencyBindingsCallParams {
    bindingsFilePath: string;
    setupFunctionName: string;
    dependencyBindingsImportPath: string;
    dependencySetupFunctionName: string;
}

export function addDependencyBindingsCall(params: AddDependencyBindingsCallParams): void {
    const { bindingsFilePath, setupFunctionName, dependencyBindingsImportPath, dependencySetupFunctionName } = params;

    const project = createOptimizedProject();
    const bindingsFile = project.addSourceFileAtPath(bindingsFilePath);

    const existingImport = bindingsFile.getImportDeclaration(dependencyBindingsImportPath);
    if (existingImport === undefined) {
        bindingsFile.addImportDeclaration({
            moduleSpecifier: dependencyBindingsImportPath,
            namedImports: [dependencySetupFunctionName],
        });
    }

    const setupFunction = bindingsFile.getFunction(setupFunctionName);
    if (setupFunction === undefined) {
        throw new Error(
            `Could not find function "${setupFunctionName}" in bindings file: ${bindingsFilePath}\n` +
            `This is required to add the dependency bindings call.`
        );
    }

    const statements = setupFunction.getStatements();
    const alreadyExists = statements.some(s => s.getText().includes(dependencySetupFunctionName));
    if (alreadyExists === false) {
        setupFunction.addStatements(`${dependencySetupFunctionName}(requestContainer);`);
    }

    bindingsFile.saveSync();
}


export interface RemoveDependencyBindingsCallParams {
    bindingsFilePath: string;
    setupFunctionName: string;
    dependencyBindingsImportPath: string;
    dependencySetupFunctionName: string;
}

export function removeDependencyBindingsCall(params: RemoveDependencyBindingsCallParams): void {
    const { bindingsFilePath, setupFunctionName, dependencyBindingsImportPath, dependencySetupFunctionName } = params;

    const project = createOptimizedProject();
    const bindingsFile = project.addSourceFileAtPath(bindingsFilePath);

    removeImport(bindingsFile, dependencyBindingsImportPath);

    const setupFunction = bindingsFile.getFunction(setupFunctionName);
    if (setupFunction !== undefined) {
        removeStatementContaining(setupFunction, dependencySetupFunctionName);
    }

    bindingsFile.saveSync();
}
