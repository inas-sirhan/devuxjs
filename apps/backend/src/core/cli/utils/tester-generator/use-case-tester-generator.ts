import path from 'path';
import fs from 'fs';
import { kebabToPascalCase, kebabToCamelCase } from '@/core/cli/utils/case-converter';
import { getInjectable } from '@/core/cli/injectables-registry/injectables-registry.manager';
import { collectAllDependencies, getDependenciesFromBaseClasses, getDependencyImportInfo, type DependencyImportInfo } from '@/core/cli/utils/type-utils';
import { BACKEND_SRC_PATH } from '@/core/cli/utils/cli-constants';


export function generateUseCaseTester(domain: string, endpointId: string): void {
    const useCaseRegistryName = `${endpointId}-use-case`;
    const useCaseConfig = getInjectable(useCaseRegistryName);

    if (useCaseConfig === undefined) {
        throw new Error(`Use-case "${useCaseRegistryName}" not found in registry`);
    }

    const isTransactional = useCaseConfig.type === 'use-case:transactional';

    const allDeps = collectAllDependencies(useCaseRegistryName);
    const baseClassDeps = getDependenciesFromBaseClasses(useCaseConfig);
    for (const dep of baseClassDeps) {
        if (allDeps.includes(dep) === false) {
            allDeps.push(dep);
        }
    }

    const imports: DependencyImportInfo[] = [];
    for (const depName of allDeps) {
        const info = getDependencyImportInfo(depName);
        if (info !== null) {
            imports.push(info);
        }
    }

    const endpointPascal = kebabToPascalCase(endpointId);
    const endpointCamel = kebabToCamelCase(endpointId);
    const controllerInterfaceName = `I${endpointPascal}Controller`;
    const presenterInterfaceName = `I${endpointPascal}Presenter`;
    const validatorInterfaceName = `I${endpointPascal}Validator`;

    const depsEntries = imports.map(info => `    '${info.registryName}': ${info.interfaceName};`);

    depsEntries.push(`    '${endpointId}-controller': ${controllerInterfaceName};`);
    depsEntries.push(`    '${endpointId}-presenter': ${presenterInterfaceName};`);
    depsEntries.push(`    '${endpointId}-validator': ${validatorInterfaceName};`);

    const importLines: string[] = [];

    if (isTransactional === true) {
        importLines.push(`import { TransactionalUseCaseTester } from '@/core/testers/use-case.transactional.tester';`);
    }
    else {
        importLines.push(`import { UseCaseTesterBase } from '@/core/testers/use-case.base.tester';`);
    }

    importLines.push(`import { ${endpointPascal}ControllerDiToken, ${endpointPascal}PresenterDiToken } from '@/__internals__/domains/${domain}/endpoints/${endpointId}/${endpointId}.inversify.tokens';`);

    const setupBindingsFunctionName = `setup${endpointPascal}Bindings`;
    importLines.push(`import { ${setupBindingsFunctionName} } from '@/__internals__/domains/${domain}/endpoints/${endpointId}/${endpointId}.inversify.bindings';`);

    const responsesName = `${endpointCamel}Responses`;
    const responsesTypeName = `${endpointPascal}Responses`;
    importLines.push(`import { ${responsesName} } from '@/domains/${domain}/endpoints/${endpointId}/${endpointId}.responses';`);
    importLines.push(`import type { ${responsesTypeName} } from '@/domains/${domain}/endpoints/${endpointId}/${endpointId}.responses';`);

    for (const info of imports) {
        importLines.push(`import type { ${info.interfaceName} } from '${info.importPath}';`);
    }

    const endpointInternalsPath = `@/__internals__/domains/${domain}/endpoints/${endpointId}`;
    importLines.push(`import type { ${controllerInterfaceName} } from '${endpointInternalsPath}/${endpointId}.controller.interface';`);
    importLines.push(`import type { ${presenterInterfaceName} } from '${endpointInternalsPath}/${endpointId}.presenter.interface';`);
    importLines.push(`import type { ${validatorInterfaceName} } from '${endpointInternalsPath}/${endpointId}.validator.interface';`);

    const inputTypeName = `${endpointPascal}Request`;
    importLines.push(`import type { ${inputTypeName} } from '@packages/shared-app/domains/${domain}/zod-schemas/${endpointId}/${endpointId}.zod.schema';`);

    const baseClassName = isTransactional ? 'TransactionalUseCaseTester' : 'UseCaseTesterBase';

    const validDepsEntries = [
        ...allDeps.map(dep => `'${dep}'`),
        `'${endpointId}-controller'`,
        `'${endpointId}-presenter'`,
        `'${endpointId}-validator'`,
    ];

    const fileContent = `${importLines.join('\n')}


type ${endpointPascal}TesterDeps = {
${depsEntries.join('\n')}
}

const validDeps: ReadonlySet<string> = new Set([
    ${validDepsEntries.join(',\n    ')},
]);


export class ${endpointPascal}Tester extends ${baseClassName}<
    ${endpointPascal}TesterDeps,
    ${inputTypeName},
    ${responsesTypeName}
> {
    public constructor() {
        super({
            endpointBindings: {
                controllerSymbol: ${endpointPascal}ControllerDiToken,
                presenterSymbol: ${endpointPascal}PresenterDiToken,
                setupEndpointBindings: ${setupBindingsFunctionName},
            },
            responses: ${responsesName},
            validDeps,
        });
    }
}
`;

    const outputPath = path.join(
        BACKEND_SRC_PATH,
        '__internals__',
        'domains',
        domain,
        'endpoints',
        endpointId,
        `${endpointId}.tester.ts`
    );

    const outputDir = path.dirname(outputPath);
    if (fs.existsSync(outputDir) === false) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, fileContent);
}


export function generateE2ETester(domain: string, endpointId: string): void {
    const endpointPascal = kebabToPascalCase(endpointId);
    const endpointCamel = kebabToCamelCase(endpointId);

    const responsesName = `${endpointCamel}Responses`;
    const responsesTypeName = `${endpointPascal}Responses`;
    const inputTypeName = `${endpointPascal}Request`;

    const importLines: string[] = [];

    importLines.push(`import { E2ETester } from '@/core/testers/e2e.tester';`);
    importLines.push(`import { ${responsesName} } from '@/domains/${domain}/endpoints/${endpointId}/${endpointId}.responses';`);
    importLines.push(`import type { ${responsesTypeName} } from '@/domains/${domain}/endpoints/${endpointId}/${endpointId}.responses';`);
    importLines.push(`import type { ${inputTypeName} } from '@packages/shared-app/domains/${domain}/zod-schemas/${endpointId}/${endpointId}.zod.schema';`);
    importLines.push(`import { Api } from '@api/api.fetch';`);

    const fileContent = `${importLines.join('\n')}


export class ${endpointPascal}E2ETester extends E2ETester<${responsesTypeName}, ${inputTypeName}> {
    public constructor() {
        super({
            responses: ${responsesName},
            apiFn: Api.${endpointCamel},
        });
    }
}
`;

    const outputPath = path.join(
        BACKEND_SRC_PATH,
        '__internals__',
        'domains',
        domain,
        'endpoints',
        endpointId,
        `${endpointId}.e2e.tester.ts`
    );

    const outputDir = path.dirname(outputPath);
    if (fs.existsSync(outputDir) === false) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, fileContent);
}
