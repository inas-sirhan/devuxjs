import path from 'path';
import { Node } from 'ts-morph';
import { BACKEND_SRC_PATH } from '@/core/cli/utils/cli-constants';
import { createOptimizedProject, ensureImport, removeImport, removeStatementContaining } from '@/core/cli/utils/ts-morph/helpers.ts-morph';


export interface AddSetupEndpointCallParams {
    domainNameKebabCase: string;
    endpointIdKebabCase: string;
    endpointIdPascalCase: string;
}

export function addSetupEndpointCall(params: AddSetupEndpointCallParams): void {
    const { domainNameKebabCase, endpointIdKebabCase, endpointIdPascalCase } = params;

    const project = createOptimizedProject();
    const setupEndpointsFilePath = path.join(BACKEND_SRC_PATH, '__internals__', 'domains', 'domains.endpoints.setup.ts');

    let sourceFile;
    try {
        sourceFile = project.addSourceFileAtPath(setupEndpointsFilePath);
    }
    catch {
        sourceFile = project.createSourceFile(setupEndpointsFilePath, '', { overwrite: false });

        sourceFile.addImportDeclaration({
            moduleSpecifier: '@/core/containers/app-container',
            namedImports: [{ name: 'AppContainer', isTypeOnly: true }],
        });

        sourceFile.addFunction({
            name: 'setupAllDomainsEndpoints',
            isExported: true,
            returnType: 'void',
            parameters: [{ name: 'container', type: 'AppContainer' }],
            statements: '',
        });
    }

    const setupFunctionName = `setup${endpointIdPascalCase}Endpoint`;
    const importPath = `@/__internals__/domains/${domainNameKebabCase}/endpoints/${endpointIdKebabCase}/${endpointIdKebabCase}.endpoint.setup`;

    ensureImport(sourceFile, importPath, setupFunctionName);

    const setupFunction = sourceFile.getFunction('setupAllDomainsEndpoints');
    if (setupFunction === undefined) {
        throw new Error('setupAllDomainsEndpoints function not found in domains.endpoints.ts');
    }

    if ((setupFunction.getBodyText() ?? '').includes(setupFunctionName) === false) {
        setupFunction.addStatements(`${setupFunctionName}(container);`);
    }

    sourceFile.saveSync();
}


export interface AddRepoBindingsCallToEndpointParams {
    domainNameKebabCase: string;
    endpointIdKebabCase: string;
    endpointIdPascalCase: string;
    repoNameKebabCase: string;
    repoNamePascalCase: string;
}

export function addRepoBindingsCallToEndpoint(params: AddRepoBindingsCallToEndpointParams): void {
    const { domainNameKebabCase, endpointIdKebabCase, endpointIdPascalCase, repoNameKebabCase, repoNamePascalCase } = params;

    const project = createOptimizedProject();
    const internalsPath = path.join(BACKEND_SRC_PATH, '__internals__', 'domains', domainNameKebabCase, 'endpoints', endpointIdKebabCase);
    const bindingsFilePath = path.join(internalsPath, `${endpointIdKebabCase}.inversify.bindings.ts`);
    const bindingsFile = project.addSourceFileAtPath(bindingsFilePath);

    const setupFunctionName = `setup${repoNamePascalCase}RepoBindings`;
    bindingsFile.addImportDeclaration({
        moduleSpecifier: `@/__internals__/domains/${domainNameKebabCase}/endpoints/${endpointIdKebabCase}/repos/${repoNameKebabCase}/${repoNameKebabCase}.repo.inversify.bindings`,
        namedImports: [setupFunctionName],
    });

    const setupFunction = bindingsFile.getFunction(`setup${endpointIdPascalCase}Bindings`);
    if (setupFunction !== undefined) {
        setupFunction.addStatements(`${setupFunctionName}(requestContainer);`);
    }

    bindingsFile.saveSync();
}


export interface RemoveRepoBindingsFromEndpointParams {
    domainNameKebabCase: string;
    endpointIdKebabCase: string;
    endpointIdPascalCase: string;
    repoNameKebabCase: string;
    repoNamePascalCase: string;
}

export function removeRepoBindingsFromEndpoint(params: RemoveRepoBindingsFromEndpointParams): void {
    const { domainNameKebabCase, endpointIdKebabCase, endpointIdPascalCase, repoNameKebabCase, repoNamePascalCase } = params;

    const project = createOptimizedProject();
    const internalsPath = path.join(BACKEND_SRC_PATH, '__internals__', 'domains', domainNameKebabCase, 'endpoints', endpointIdKebabCase);
    const bindingsFilePath = path.join(internalsPath, `${endpointIdKebabCase}.inversify.bindings.ts`);
    const bindingsFile = project.addSourceFileAtPath(bindingsFilePath);

    const setupFunctionName = `setup${repoNamePascalCase}RepoBindings`;
    const repoBindingsImportPath = `@/__internals__/domains/${domainNameKebabCase}/endpoints/${endpointIdKebabCase}/repos/${repoNameKebabCase}/${repoNameKebabCase}.repo.inversify.bindings`;
    removeImport(bindingsFile, repoBindingsImportPath);

    const setupFunction = bindingsFile.getFunction(`setup${endpointIdPascalCase}Bindings`);
    if (setupFunction !== undefined) {
        removeStatementContaining(setupFunction, setupFunctionName);
    }

    bindingsFile.saveSync();
}


export interface GetEndpointHttpMethodParams {
    domainNameKebabCase: string;
    endpointIdKebabCase: string;
}

export function getEndpointHttpMethod(params: GetEndpointHttpMethodParams): string | null {
    const { domainNameKebabCase, endpointIdKebabCase } = params;

    const routeConfigPath = path.join(
        BACKEND_SRC_PATH,
        'domains',
        domainNameKebabCase,
        'endpoints',
        endpointIdKebabCase,
        `${endpointIdKebabCase}.route.config.ts`
    );

    const endpointIdCamelCase = endpointIdKebabCase.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    const expectedVarName = `${endpointIdCamelCase}RouteConfig`;

    try {
        const project = createOptimizedProject();
        const sourceFile = project.addSourceFileAtPath(routeConfigPath);

        const variableDeclaration = sourceFile.getVariableDeclaration(expectedVarName);
        if (variableDeclaration === undefined) {
            return null;
        }

        const initializer = variableDeclaration.getInitializer();
        if (Node.isCallExpression(initializer) === true) {
            const args = initializer.getArguments();
            if (args.length > 0 && Node.isObjectLiteralExpression(args[0])) {
                const configObj = args[0];
                const methodProperty = configObj.getProperty('method');
                if (Node.isPropertyAssignment(methodProperty) === true) {
                    const methodValue = methodProperty.getInitializer();
                    if (methodValue !== undefined) {
                        return methodValue.getText().replace(/['"]/g, '');
                    }
                }
            }
        }
        return null;
    }
    catch {
        return null;
    }
}
