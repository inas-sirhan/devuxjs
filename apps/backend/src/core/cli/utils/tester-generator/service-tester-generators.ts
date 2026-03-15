import path from 'path';
import fs from 'fs';
import { kebabToPascalCase } from '@/core/cli/utils/case-converter';
import { getInjectable } from '@/core/cli/injectables-registry/injectables-registry.manager';
import { collectAllDependencies, getDependenciesFromBaseClasses, getDependencyImportInfo, type DependencyImportInfo } from '@/core/cli/utils/type-utils';
import { BACKEND_SRC_PATH } from '@/core/cli/utils/cli-constants';


export interface GenerateDomainServiceTesterParams {
    domainName: string;
    serviceName: string;
}

export function generateDomainServiceTester(params: GenerateDomainServiceTesterParams): void {
    const { domainName, serviceName } = params;

    const servicePascal = kebabToPascalCase(serviceName);
    const serviceRegistryName = `${serviceName}-service`;
    const serviceConfig = getInjectable(serviceRegistryName);

    const internalsBasePath = `@/__internals__/domains/${domainName}/services/${serviceName}`;

    const outputPath = path.join(
        BACKEND_SRC_PATH,
        '__internals__',
        'domains',
        domainName,
        'services',
        serviceName,
        `${serviceName}.tester.ts`
    );

    let allDeps: string[] = [];
    if (serviceConfig !== undefined) {
        allDeps = collectAllDependencies(serviceRegistryName);
        const baseClassDeps = getDependenciesFromBaseClasses(serviceConfig);
        for (const dep of baseClassDeps) {
            if (allDeps.includes(dep) === false) {
                allDeps.push(dep);
            }
        }
    }

    const depImports: DependencyImportInfo[] = [];
    for (const depName of allDeps) {
        const info = getDependencyImportInfo(depName);
        if (info !== null) {
            depImports.push(info);
        }
    }

    const depsEntries = depImports.map(info => `    '${info.registryName}': ${info.interfaceName};`);

    const importLines: string[] = [];

    importLines.push(`import { DomainServiceTester } from '@/core/testers/domain-service.tester';`);

    importLines.push(`import { setup${servicePascal}Bindings } from '${internalsBasePath}/${serviceName}.inversify.bindings';`);
    importLines.push(`import { ${servicePascal}DiToken } from '${internalsBasePath}/${serviceName}.inversify.tokens';`);

    importLines.push(`import type { ${servicePascal}Input, ${servicePascal}Output } from '${internalsBasePath}/${serviceName}.interface';`);

    for (const info of depImports) {
        importLines.push(`import type { ${info.interfaceName} } from '${info.importPath}';`);
    }

    const validDepsEntries = allDeps.map(dep => `'${dep}'`);

    const fileContent = `${importLines.join('\n')}


type ${servicePascal}TesterDeps = {
${depsEntries.length > 0 ? depsEntries.join('\n') : ''}
}

const validDeps: ReadonlySet<string> = new Set([
    ${validDepsEntries.length > 0 ? validDepsEntries.join(',\n    ') + ',' : ''}
]);


export class ${servicePascal}Tester extends DomainServiceTester<${servicePascal}TesterDeps, ${servicePascal}Input, ${servicePascal}Output> {
    public constructor() {
        super({
            setupServiceBindings: setup${servicePascal}Bindings,
            serviceToken: ${servicePascal}DiToken,
            validDeps,
        });
    }
}
`;

    const outputDir = path.dirname(outputPath);
    if (fs.existsSync(outputDir) === false) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, fileContent);
}


export interface GenerateAppServiceTesterParams {
    serviceName: string;
    isGlobal: boolean;
}

export function generateAppServiceTester(params: GenerateAppServiceTesterParams): void {
    const { serviceName, isGlobal } = params;

    const servicePascal = kebabToPascalCase(serviceName);
    const serviceRegistryName = `${serviceName}-app-service`;
    const serviceConfig = getInjectable(serviceRegistryName);

    const internalsBasePath = `@/__internals__/app-services/${serviceName}`;
    const appServiceBasePath = `@/app-services/${serviceName}`;

    const outputPath = path.join(
        BACKEND_SRC_PATH,
        '__internals__',
        'app-services',
        serviceName,
        `${serviceName}.tester.ts`
    );

    let allDeps: string[] = [];
    if (serviceConfig !== undefined) {
        allDeps = collectAllDependencies(serviceRegistryName);
        const baseClassDeps = getDependenciesFromBaseClasses(serviceConfig);
        for (const dep of baseClassDeps) {
            if (allDeps.includes(dep) === false) {
                allDeps.push(dep);
            }
        }
    }

    const depImports: DependencyImportInfo[] = [];
    for (const depName of allDeps) {
        const info = getDependencyImportInfo(depName);
        if (info !== null) {
            depImports.push(info);
        }
    }

    const depsEntries = depImports.map(info => `    '${info.registryName}': ${info.interfaceName};`);

    const importLines: string[] = [];

    importLines.push(`import { AppServiceTester } from '@/core/testers/app-service.tester';`);

    importLines.push(`import { setup${servicePascal}Bindings } from '${internalsBasePath}/${serviceName}.inversify.bindings';`);
    importLines.push(`import { ${servicePascal}DiToken } from '${internalsBasePath}/${serviceName}.inversify.tokens';`);

    importLines.push(`import type { I${servicePascal} } from '${appServiceBasePath}/${serviceName}.interface';`);

    for (const info of depImports) {
        importLines.push(`import type { ${info.interfaceName} } from '${info.importPath}';`);
    }

    const validDepsEntries = allDeps.map(dep => `'${dep}'`);

    const fileContent = `${importLines.join('\n')}


type ${servicePascal}TesterDeps = {
${depsEntries.length > 0 ? depsEntries.join('\n') : ''}
}

const validDeps: ReadonlySet<string> = new Set([
    ${validDepsEntries.length > 0 ? validDepsEntries.join(',\n    ') + ',' : ''}
]);


export class ${servicePascal}Tester extends AppServiceTester<I${servicePascal}, ${servicePascal}TesterDeps> {
    public constructor() {
        super({
            setupServiceBindings: setup${servicePascal}Bindings,
            serviceToken: ${servicePascal}DiToken,
            isGlobal: ${isGlobal},
            validDeps,
        });
    }
}
`;

    const outputDir = path.dirname(outputPath);
    if (fs.existsSync(outputDir) === false) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, fileContent);
}
