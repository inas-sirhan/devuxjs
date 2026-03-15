import path from 'path';
import fs from 'fs';
import * as p from '@clack/prompts';
import { kebabToPascalCase, kebabToCamelCase, isKebabCase } from '@/core/cli/utils/case-converter';
import { configureEta, renderAndSave, type TemplateContext } from '@/core/cli/utils/file-generator';
import { addRepoBindingsCallToService, removeRepoBindingsCallFromService, addRepoToDomainService, removeRepoFromDomainService } from '@/core/cli/utils/ts-morph/domain-service-operations.ts-morph';
import { coreConfig } from '@/infrastructure/core/core.config';
import { getAllInjectables, removeInjectable, getInjectable, saveRegistry } from '@/core/cli/injectables-registry/injectables-registry.manager';
import { registerInjectable, updateInjectableDependencies } from '@/core/cli/injectables-registry/injectables-registry.updater';
import { selectAction, confirmAction, promptRequiredText, selectRequired, handleUnexpectedError } from '@/core/cli/utils/ui-utils';
import { generateRepoTestFile } from '@/core/cli/utils/tester-generator/test-file-generators';
import { generateRepoTester } from '@/core/cli/utils/tester-generator/repo-tester-generator';
import { BACKEND_SRC_PATH, TEMPLATES_PATH } from '@/core/cli/utils/cli-constants';


export function getDomainServiceRepos(serviceName: string): string[] {
    const injectables = getAllInjectables();
    const repos: string[] = [];

    for (const [name, config] of Object.entries(injectables)) {
        if (config.type === 'repo:service:domain') {
            if ('dependents' in config && config.dependents.includes(serviceName)) {
                repos.push(name.replace(/-repo$/, ''));
            }
        }
    }

    return repos.sort();
}


export async function createDomainServiceRepo(domain: string, service: string): Promise<void> {
    const domainNameKebabCase = domain;
    const domainNamePascalCase = kebabToPascalCase(domainNameKebabCase);
    const domainNameCamelCase = kebabToCamelCase(domainNameKebabCase);

    const serviceNameKebabCase = service;
    const serviceNamePascalCase = kebabToPascalCase(serviceNameKebabCase);
    const serviceNameCamelCase = kebabToCamelCase(serviceNameKebabCase);

    const repoName = await promptRequiredText(
        'Enter repo name (kebab-case):',
        'Repo name is required',
        (value) => {
            if (isKebabCase(value) === false) {
                return 'Repo name must be in kebab-case';
            }
            const repoRegistryKey = `${value}-repo`;
            if (getInjectable(repoRegistryKey) !== undefined) {
                return `Cannot create service repo: "${repoRegistryKey}" already exists in registry. Choose a different name.`;
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

    const repoRegistryKey = `${repoNameKebabCase}-repo`;
    if (getInjectable(repoRegistryKey) !== undefined) {
        p.log.error(`Cannot create service repo "${repoNameKebabCase}": "${repoRegistryKey}" already exists in registry.`);
        return;
    }

    const repoOperation = await selectRequired('What type of operation will this repo perform?', [
        { value: 'write' as const, label: 'Write (insert/update)' },
        { value: 'read' as const, label: 'Read (select/query)' },
        { value: 'delete' as const, label: 'Delete' },
    ]);

    const context: TemplateContext = {
        domainNameKebabCase,
        domainNamePascalCase,
        domainNameCamelCase,
        serviceNameKebabCase,
        serviceNamePascalCase,
        serviceNameCamelCase,
        repoNameKebabCase,
        repoNamePascalCase,
        repoNameCamelCase,
        repoOperation,
        generateUniqueKeyViolationErrorMap: coreConfig.generator.repo.generateUniqueKeyViolationErrorMap,
        generateForeignKeyViolationErrorMap: coreConfig.generator.repo.generateForeignKeyViolationErrorMap,
    };

    const s = p.spinner();
    s.start('Generating service repo files...');

    configureEta(TEMPLATES_PATH);

    const repoPath = path.join(BACKEND_SRC_PATH, 'domains', domainNameKebabCase, 'services', serviceNameKebabCase, 'repos', repoNameKebabCase);
    const internalsPath = path.join(BACKEND_SRC_PATH, '__internals__', 'domains', domainNameKebabCase, 'services', serviceNameKebabCase, 'repos', repoNameKebabCase);

    const developerFiles = [
        { template: 'domain-repo.zod.schemas.ts.eta', output: `${repoNameKebabCase}.repo.zod.schemas.ts` },
        { template: 'domain-repo.ts.eta', output: `${repoNameKebabCase}.repo.ts` },
    ];

    const internalFiles = [
        { template: 'domain-repo.interface.ts.eta', output: `${repoNameKebabCase}.repo.interface.ts` },
        { template: 'domain-repo.inversify.tokens.ts.eta', output: `${repoNameKebabCase}.repo.inversify.tokens.ts` },
        { template: 'domain-repo.inversify.bindings.ts.eta', output: `${repoNameKebabCase}.repo.inversify.bindings.ts` },
    ];

    for (const { template, output } of developerFiles) {
        renderAndSave(template, context, path.join(repoPath, output));
    }

    for (const { template, output } of internalFiles) {
        renderAndSave(template, context, path.join(internalsPath, output));
    }

    fs.mkdirSync(path.join(repoPath, 'tests'), { recursive: true });

    const repoRegistryName = `${repoNameKebabCase}-repo`;
    registerInjectable(repoRegistryName, {
        type: 'repo:service:domain',
        domain: domainNameKebabCase,
    });

    const serviceConfig = getInjectable(serviceNameKebabCase);
    if (serviceConfig !== undefined) {
        const serviceDeps = serviceConfig.dependencies !== undefined ? serviceConfig.dependencies : [];
        updateInjectableDependencies(serviceNameKebabCase, [...serviceDeps, repoRegistryName]);
    }

    try {
        addRepoBindingsCallToService({
            domainNameKebabCase,
            serviceNameKebabCase,
            serviceNamePascalCase,
            repoNameKebabCase,
            repoNamePascalCase,
        });
    }
    catch (error) {
        p.log.error(`Failed to update service bindings: ${error}`);
        handleUnexpectedError();
    }

    try {
        addRepoToDomainService({
            domainNameKebabCase,
            serviceNameKebabCase,
            serviceNamePascalCase,
            repoNameKebabCase,
            repoNamePascalCase,
            repoNameCamelCase,
        });
    }
    catch (error) {
        p.log.error(`Failed to inject repo into service: ${error}`);
        handleUnexpectedError();
    }

    saveRegistry();

    generateRepoTester({
        repoType: 'service',
        domainName: domainNameKebabCase,
        repoName: repoNameKebabCase,
        isTransactional: true,
        serviceName: serviceNameKebabCase,
    });
    generateRepoTestFile({
        repoType: 'service',
        domainName: domainNameKebabCase,
        repoName: repoNameKebabCase,
        serviceName: serviceNameKebabCase,
    });

    s.stop(`Successfully generated service repo: ${domainNameKebabCase}/${serviceNameKebabCase}/${repoNameKebabCase}`);
}

export async function deleteDomainServiceRepo(domain: string, service: string): Promise<void> {
    const repos = getDomainServiceRepos(service);

    if (repos.length === 0) {
        p.log.warning(`No repos found for service "${service}".`);
        return;
    }

    const selectedRepo = await selectAction('Select repo to delete:', repos.map(r => ({ value: r, label: r })));

    if (selectedRepo === null) {
        return;
    }

    const repoNameKebabCase = selectedRepo;
    const repoRegistryName = `${repoNameKebabCase}-repo`;
    const repoConfig = getInjectable(repoRegistryName);

    if (repoConfig === undefined) {
        p.log.error(`Repo "${repoRegistryName}" not found in registry.`);
        return;
    }

    const confirmed = await confirmAction(`Are you sure you want to delete "${repoRegistryName}"?`);
    if (confirmed === false) {
        p.log.info('Deletion cancelled.');
        return;
    }

    const repoNamePascalCase = kebabToPascalCase(repoNameKebabCase);
    const serviceNamePascalCase = kebabToPascalCase(service);

    const s = p.spinner();
    s.start('Deleting service repo...');

    try {
        removeRepoBindingsCallFromService({
            domainNameKebabCase: domain,
            serviceNameKebabCase: service,
            serviceNamePascalCase,
            repoNameKebabCase,
            repoNamePascalCase,
        });
    }
    catch (error) {
        p.log.error(`Failed to remove repo bindings call: ${error}`);
        handleUnexpectedError();
    }

    try {
        removeRepoFromDomainService({
            domainNameKebabCase: domain,
            serviceNameKebabCase: service,
            serviceNamePascalCase,
            repoNameKebabCase,
            repoNamePascalCase,
        });
    }
    catch (error) {
        p.log.error(`Failed to remove repo from service: ${error}`);
        handleUnexpectedError();
    }

    const repoPath = path.join(BACKEND_SRC_PATH, 'domains', domain, 'services', service, 'repos', repoNameKebabCase);
    const internalsRepoPath = path.join(BACKEND_SRC_PATH, '__internals__', 'domains', domain, 'services', service, 'repos', repoNameKebabCase);

    fs.rmSync(repoPath, { recursive: true, force: true });
    fs.rmSync(internalsRepoPath, { recursive: true, force: true });

    const serviceConfig = getInjectable(service);
    if (serviceConfig !== undefined) {
        const currentDeps = serviceConfig.dependencies !== undefined ? serviceConfig.dependencies : [];
        const newDeps = currentDeps.filter(dep => dep !== repoRegistryName);
        updateInjectableDependencies(service, newDeps);
    }

    removeInjectable(repoRegistryName);

    saveRegistry();

    s.stop(`Successfully deleted service repo: ${domain}/${service}/${repoNameKebabCase}`);
}
