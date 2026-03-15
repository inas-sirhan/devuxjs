import path from 'path';
import fs from 'fs';
import { kebabToPascalCase } from '@/core/cli/utils/case-converter';
import { getInjectable } from '@/core/cli/injectables-registry/injectables-registry.manager';
import { collectAllDependencies, getDependenciesFromBaseClasses, getDependencyImportInfo, type DependencyImportInfo } from '@/core/cli/utils/type-utils';
import { BACKEND_SRC_PATH } from '@/core/cli/utils/cli-constants';


export interface GenerateRepoTesterParams {
    repoType: 'endpoint' | 'domain' | 'service';
    domainName: string;
    repoName: string;
    isTransactional: boolean;
    endpointId?: string;
    serviceName?: string;
}

export function generateRepoTester(params: GenerateRepoTesterParams): void {
    const { repoType, domainName, repoName, isTransactional, endpointId, serviceName } = params;

    const repoPascal = kebabToPascalCase(repoName);
    const repoRegistryName = `${repoName}-repo`;
    const repoConfig = getInjectable(repoRegistryName);

    if (repoConfig === undefined) {
        throw new Error(`Repo "${repoRegistryName}" not found in registry`);
    }

    const allDeps = collectAllDependencies(repoRegistryName);
    const baseClassDeps = getDependenciesFromBaseClasses(repoConfig);
    for (const dep of baseClassDeps) {
        if (allDeps.includes(dep) === false) {
            allDeps.push(dep);
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

    let internalsBasePath: string;
    let outputPath: string;

    if (repoType === 'endpoint') {
        if (endpointId === undefined || endpointId === '') {
            throw new Error('endpointId required for endpoint repo tester');
        }
        internalsBasePath = `@/__internals__/domains/${domainName}/endpoints/${endpointId}/repos/${repoName}`;
        outputPath = path.join(
            BACKEND_SRC_PATH,
            '__internals__',
            'domains',
            domainName,
            'endpoints',
            endpointId,
            'repos',
            repoName,
            `${repoName}.repo.tester.ts`
        );
    }
    else {
        if (repoType === 'domain') {
            internalsBasePath = `@/__internals__/domains/${domainName}/repos/${repoName}`;
            outputPath = path.join(
                BACKEND_SRC_PATH,
                '__internals__',
                'domains',
                domainName,
                'repos',
                repoName,
                `${repoName}.repo.tester.ts`
            );
        }
        else {
            if (serviceName === undefined || serviceName === '') {
                throw new Error('serviceName required for service repo tester');
            }
            internalsBasePath = `@/__internals__/domains/${domainName}/services/${serviceName}/repos/${repoName}`;
            outputPath = path.join(
                BACKEND_SRC_PATH,
                '__internals__',
                'domains',
                domainName,
                'services',
                serviceName,
                'repos',
                repoName,
                `${repoName}.repo.tester.ts`
            );
        }
    }

    const importLines: string[] = [];

    if (isTransactional === true) {
        importLines.push(`import { TransactionalRepoTesterBase } from '@/core/testers/repo.transactional.tester';`);
    }
    else {
        importLines.push(`import { RepoTesterBase } from '@/core/testers/repo.base.tester';`);
    }

    importLines.push(`import { setup${repoPascal}RepoBindings } from '${internalsBasePath}/${repoName}.repo.inversify.bindings';`);
    importLines.push(`import { ${repoPascal}RepoDiToken } from '${internalsBasePath}/${repoName}.repo.inversify.tokens';`);

    importLines.push(`import type { ${repoPascal}RepoInput, ${repoPascal}RepoOutput } from '${internalsBasePath}/${repoName}.repo.interface';`);

    for (const info of depImports) {
        importLines.push(`import type { ${info.interfaceName} } from '${info.importPath}';`);
    }

    const baseClassName = isTransactional ? 'TransactionalRepoTesterBase' : 'RepoTesterBase';

    const validDepsEntries = allDeps.map(dep => `'${dep}'`);

    const fileContent = `${importLines.join('\n')}


type ${repoPascal}RepoTesterDeps = {
${depsEntries.length > 0 ? depsEntries.join('\n') : ''}
}

const validDeps: ReadonlySet<string> = new Set([
    ${validDepsEntries.length > 0 ? validDepsEntries.join(',\n    ') + ',' : ''}
]);


export class ${repoPascal}RepoTester extends ${baseClassName}<${repoPascal}RepoTesterDeps, ${repoPascal}RepoInput, ${repoPascal}RepoOutput> {
    public constructor() {
        super({
            setupRepoBindings: setup${repoPascal}RepoBindings,
            repoToken: ${repoPascal}RepoDiToken,
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
