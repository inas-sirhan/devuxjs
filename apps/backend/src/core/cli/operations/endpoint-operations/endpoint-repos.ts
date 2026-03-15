import path from 'path';
import fs from 'fs';
import * as p from '@clack/prompts';
import { kebabToPascalCase, kebabToCamelCase } from '@/core/cli/utils/case-converter';
import { validateEndpointRepoName } from '@/core/cli/utils/validators';
import { configureEta, renderAndSave, type TemplateContext } from '@/core/cli/utils/file-generator';
import { addRepoBindingsCallToEndpoint, getEndpointHttpMethod, removeRepoBindingsFromEndpoint } from '@/core/cli/utils/ts-morph/endpoint-operations.ts-morph';
import { addRepoToUseCase, removeRepoFromUseCase } from '@/core/cli/utils/ts-morph/use-case-injections.ts-morph';
import { coreConfig } from '@/infrastructure/core/core.config';
import { getInjectable, removeInjectable, saveRegistry } from '@/core/cli/injectables-registry/injectables-registry.manager';
import { registerEndpointInjectable, updateInjectableDependencies } from '@/core/cli/injectables-registry/injectables-registry.updater';
import { checkEndpointRepoCollision } from '@/core/cli/utils/collision-detection';
import { handleUnexpectedError, selectRequired, confirmAction, promptRequiredText } from '@/core/cli/utils/ui-utils';
import { httpMethodToRepoOperation, type RepoOperation } from '@/core/cli/utils/type-utils';
import { generateUseCaseTester } from '@/core/cli/utils/tester-generator/use-case-tester-generator';
import { generateRepoTester } from '@/core/cli/utils/tester-generator/repo-tester-generator';
import { generateRepoTestFile } from '@/core/cli/utils/tester-generator/test-file-generators';
import { BACKEND_SRC_PATH, TEMPLATES_PATH } from '@/core/cli/utils/cli-constants';

export async function createEndpointRepo(domain: string, endpoint: string): Promise<void> {
    const domainNameKebabCase = domain;
    const domainNamePascalCase = kebabToPascalCase(domainNameKebabCase);
    const domainNameCamelCase = kebabToCamelCase(domainNameKebabCase);

    const endpointIdKebabCase = endpoint;
    const endpointIdPascalCase = kebabToPascalCase(endpointIdKebabCase);
    const endpointIdCamelCase = kebabToCamelCase(endpointIdKebabCase);

    const useCaseName = `${endpointIdKebabCase}-use-case`;
    const useCaseConfig = getInjectable(useCaseName)!;


    const useTransaction = useCaseConfig.type === 'use-case:transactional';

    const repoName = await promptRequiredText(
        'Enter repo name (kebab-case):',
        'Repo name is required',
        (value) => {
            const result = validateEndpointRepoName(value);
            if (result.valid === false) {
                return result.error;
            }
            const collision = checkEndpointRepoCollision(value);
            if (collision !== null) {
                return collision.message;
            }
            return undefined;
        }
    );

    if (repoName === null) {
        return;
    }

    const repoNameKebabCase = repoName;
    const repoNamePascalCase = kebabToPascalCase(repoNameKebabCase);
    const repoNameCamelCase = kebabToCamelCase(repoNameKebabCase);

    const repoCollision = checkEndpointRepoCollision(repoNameKebabCase);
    if (repoCollision !== null) {
        p.log.error(repoCollision.message);
        return;
    }

    const httpMethod = getEndpointHttpMethod({
        domainNameKebabCase,
        endpointIdKebabCase,
    });

    let repoOperation: RepoOperation;
    if (httpMethod !== null) {
        repoOperation = httpMethodToRepoOperation(httpMethod);
    }
    else {
        repoOperation = await selectRequired('What type of operation will this repo perform?', [
            { value: 'write' as const, label: 'Write (insert/update)' },
            { value: 'read' as const, label: 'Read (select/query)' },
            { value: 'delete' as const, label: 'Delete' },
        ]);
    }

    const context: TemplateContext = {
        domainNameKebabCase,
        domainNamePascalCase,
        domainNameCamelCase,
        endpointIdKebabCase,
        endpointIdPascalCase,
        endpointIdCamelCase,
        repoNameKebabCase,
        repoNamePascalCase,
        repoNameCamelCase,
        repoOperation,
        useTransaction,
        generateUniqueKeyViolationErrorMap: coreConfig.generator.repo.generateUniqueKeyViolationErrorMap,
        generateForeignKeyViolationErrorMap: coreConfig.generator.repo.generateForeignKeyViolationErrorMap,
    };

    const s = p.spinner();
    s.start('Generating endpoint repo files...');

    configureEta(TEMPLATES_PATH);

    const repoPath = path.join(BACKEND_SRC_PATH, 'domains', domainNameKebabCase, 'endpoints', endpointIdKebabCase, 'repos', repoNameKebabCase);
    const internalsPath = path.join(BACKEND_SRC_PATH, '__internals__', 'domains', domainNameKebabCase, 'endpoints', endpointIdKebabCase, 'repos', repoNameKebabCase);

    const developerFiles = [
        { template: 'endpoint-repo.zod.schemas.ts.eta', output: `${repoNameKebabCase}.repo.zod.schemas.ts` },
        { template: 'endpoint-repo.ts.eta', output: `${repoNameKebabCase}.repo.ts` },
    ];

    const internalFiles = [
        { template: 'endpoint-repo.interface.ts.eta', output: `${repoNameKebabCase}.repo.interface.ts` },
        { template: 'endpoint-repo.inversify.tokens.ts.eta', output: `${repoNameKebabCase}.repo.inversify.tokens.ts` },
        { template: 'endpoint-repo.inversify.bindings.ts.eta', output: `${repoNameKebabCase}.repo.inversify.bindings.ts` },
    ];

    for (const { template, output } of developerFiles) {
        renderAndSave(template, context, path.join(repoPath, output));
    }

    for (const { template, output } of internalFiles) {
        renderAndSave(template, context, path.join(internalsPath, output));
    }

    fs.mkdirSync(path.join(repoPath, 'tests'), { recursive: true });

    try {
        addRepoBindingsCallToEndpoint({
            domainNameKebabCase,
            endpointIdKebabCase,
            endpointIdPascalCase,
            repoNameKebabCase,
            repoNamePascalCase,
        });
    }
    catch (error) {
        s.stop('Failed to generate endpoint repo');
        p.log.error(`Failed to update inversify files: ${error}`);
        handleUnexpectedError();
    }

    try {
        addRepoToUseCase({
            domainNameKebabCase,
            endpointIdKebabCase,
            endpointIdPascalCase,
            repoNameKebabCase,
            repoNamePascalCase,
            repoNameCamelCase,
        });
    }
    catch (error) {
        p.log.error(`Failed to inject repo into use-case: ${error}`);
        handleUnexpectedError();
    }

    const repoRegistryName = `${repoNameKebabCase}-repo`;
    registerEndpointInjectable(repoRegistryName, {
        type: useTransaction ? 'repo:endpoint:transactional' : 'repo:endpoint:non-transactional',
        domain: domainNameKebabCase,
        dependencies: [],
    });

    const useCaseRegistryName = `${endpointIdKebabCase}-use-case`;
    const useCaseDeps = useCaseConfig.dependencies;
    updateInjectableDependencies(useCaseRegistryName, [...useCaseDeps, repoRegistryName]);

    saveRegistry();

    generateUseCaseTester(domainNameKebabCase, endpointIdKebabCase);

    generateRepoTester({
        repoType: 'endpoint',
        domainName: domainNameKebabCase,
        repoName: repoNameKebabCase,
        isTransactional: useTransaction,
        endpointId: endpointIdKebabCase,
    });
    generateRepoTestFile({
        repoType: 'endpoint',
        domainName: domainNameKebabCase,
        repoName: repoNameKebabCase,
        endpointId: endpointIdKebabCase,
    });

    s.stop(`Successfully generated endpoint repo: ${domainNameKebabCase}/${endpointIdKebabCase}/${repoNameKebabCase}`);
}

export async function deleteEndpointRepo(domain: string, endpoint: string, repoName: string): Promise<void> {
    const domainNameKebabCase = domain;
    const endpointIdKebabCase = endpoint;
    const endpointIdPascalCase = kebabToPascalCase(endpointIdKebabCase);

    const repoNameKebabCase = repoName.replace(/-repo$/, '');
    const repoNamePascalCase = kebabToPascalCase(repoNameKebabCase);

    const useCaseName = `${endpointIdKebabCase}-use-case`;
    const useCaseConfig = getInjectable(useCaseName);

    if (useCaseConfig === undefined) {
        throw new Error(`Use-case "${useCaseName}" not found in registry`);
    }

    const confirmed = await confirmAction(`Are you sure you want to delete "${repoName}"?`);
    if (confirmed === false) {
        p.log.info('Deletion cancelled.');
        return;
    }

    const s = p.spinner();
    s.start('Deleting endpoint repo...');

    try {
        removeRepoFromUseCase({
            domainNameKebabCase,
            endpointIdKebabCase,
            endpointIdPascalCase,
            repoNameKebabCase,
            repoNamePascalCase,
        });
    }
    catch (error) {
        p.log.error(`Failed to remove repo from use-case: ${error}`);
        handleUnexpectedError();
    }

    try {
        removeRepoBindingsFromEndpoint({
            domainNameKebabCase,
            endpointIdKebabCase,
            endpointIdPascalCase,
            repoNameKebabCase,
            repoNamePascalCase,
        });
    }
    catch (error) {
        p.log.error(`Failed to remove repo from inversify files: ${error}`);
        handleUnexpectedError();
    }

    const repoPath = path.join(BACKEND_SRC_PATH, 'domains', domainNameKebabCase, 'endpoints', endpointIdKebabCase, 'repos', repoNameKebabCase);
    const internalsRepoPath = path.join(BACKEND_SRC_PATH, '__internals__', 'domains', domainNameKebabCase, 'endpoints', endpointIdKebabCase, 'repos', repoNameKebabCase);

    fs.rmSync(repoPath, { recursive: true, force: true });
    fs.rmSync(internalsRepoPath, { recursive: true, force: true });

    const newDeps = useCaseConfig.dependencies.filter(dep => dep !== repoName);
    updateInjectableDependencies(useCaseName, newDeps);

    removeInjectable(repoName);

    saveRegistry();

    generateUseCaseTester(domainNameKebabCase, endpointIdKebabCase);

    s.stop(`Successfully deleted endpoint repo: ${domainNameKebabCase}/${endpointIdKebabCase}/${repoName}`);
}
