import path from 'path';
import fs from 'fs';
import * as p from '@clack/prompts';
import { kebabToPascalCase, kebabToCamelCase } from '@/core/cli/utils/case-converter';
import { validateRepoName } from '@/core/cli/utils/validators';
import { configureEta, renderAndSave, type TemplateContext } from '@/core/cli/utils/file-generator';
import { removeInjectable, getInjectable, saveRegistry } from '@/core/cli/injectables-registry/injectables-registry.manager';
import { registerInjectable } from '@/core/cli/injectables-registry/injectables-registry.updater';
import { coreConfig } from '@/infrastructure/core/core.config';
import { selectAction, confirmAction, promptRequiredText, selectRequired } from '@/core/cli/utils/ui-utils';
import { selectDomain, selectDomainRepo } from '@/core/cli/utils/selectors';
import { checkInjectableCollision } from '@/core/cli/utils/collision-detection';
import { generateRepoTestFile } from '@/core/cli/utils/tester-generator/test-file-generators';
import { generateRepoTester } from '@/core/cli/utils/tester-generator/repo-tester-generator';
import { BACKEND_SRC_PATH, TEMPLATES_PATH } from '@/core/cli/utils/cli-constants';
import { addInjectableDependency, removeInjectableDependency } from '@/core/cli/operations/dependency-operations/injectable-dependencies';


export async function domainReposMenu(): Promise<void> {
    while (true) {
        const action = await selectAction('Domain Repos - What do you want to do?', [
            { value: 'create', label: 'Create' },
            { value: 'rename', label: 'Rename', hint: 'currently disabled' },
            { value: 'delete', label: 'Delete' },
            { value: 'manage', label: 'Manage dependencies' },
        ]);

        if (action === null) {
            return;
        }

        switch (action) {
            case 'create':
                await createDomainRepo();
                break;
            case 'rename':
                p.log.warning('Rename is currently disabled.');
                break;
            case 'delete':
                await deleteDomainRepo();
                break;
            case 'manage':
                await manageDomainRepoDependencies();
                break;
        }
    }
}


async function deleteDomainRepo(): Promise<void> {
    const domain = await selectDomain();
    if (domain === null) {
        return;
    }

    const repo = await selectDomainRepo(domain);
    if (repo === null) {
        return;
    }

    const repoRegistryName = `${repo}-repo`;
    const repoConfig = getInjectable(repoRegistryName);

    if (repoConfig === undefined) {
        p.log.error(`Repo "${repoRegistryName}" not found in registry.`);
        return;
    }

    if ('dependents' in repoConfig && repoConfig.dependents.length > 0) {
        p.log.error(`Cannot delete "${repoRegistryName}": It is used by ${repoConfig.dependents.length} injectable(s):`);
        for (const dependent of repoConfig.dependents) {
            p.log.step(`- ${dependent}`);
        }
        p.log.info('Remove this repo from each dependent first using "Manage dependencies", then try again.');
        return;
    }

    const confirmed = await confirmAction(`Are you sure you want to delete "${repoRegistryName}"?`);
    if (confirmed === false) {
        p.log.info('Deletion cancelled.');
        return;
    }

    const s = p.spinner();
    s.start('Deleting domain repo...');

    const repoPath = path.join(BACKEND_SRC_PATH, 'domains', domain, 'repos', repo);
    const internalsRepoPath = path.join(BACKEND_SRC_PATH, '__internals__', 'domains', domain, 'repos', repo);

    fs.rmSync(repoPath, { recursive: true, force: true });
    fs.rmSync(internalsRepoPath, { recursive: true, force: true });

    removeInjectable(repoRegistryName);

    saveRegistry();

    s.stop(`Successfully deleted domain repo: ${domain}/${repo}`);
}

async function manageDomainRepoDependencies(): Promise<void> {
    const domain = await selectDomain();
    if (domain === null) {
        return;
    }

    const repo = await selectDomainRepo(domain);
    if (repo === null) {
        return;
    }

    while (true) {
        const action = await selectAction(`Manage "${repo}" dependencies - What do you want to do?`, [
            { value: 'add', label: 'Add dependency' },
            { value: 'remove', label: 'Remove dependency' },
        ]);

        if (action === null) {
            return;
        }

        switch (action) {
            case 'add':
                await addInjectableDependency(`${repo}-repo`);
                break;
            case 'remove':
                await removeInjectableDependency(`${repo}-repo`);
                break;
        }
    }
}


async function createDomainRepo(): Promise<void> {
    const domain = await selectDomain('Select domain for repo:');
    if (domain === null) {
        return;
    }

    const domainNameKebabCase = domain;
    const domainNamePascalCase = kebabToPascalCase(domainNameKebabCase);
    const domainNameCamelCase = kebabToCamelCase(domainNameKebabCase);

    const repoName = await promptRequiredText(
        'Enter repo name (kebab-case):',
        'Repo name is required',
        (value) => {
            const result = validateRepoName(value, domainNameKebabCase);
            if (result.valid === false) {
                return result.error;
            }
            // 'repo:domain' because transactional/non-transactional choice hasn't been made yet
            const collision = checkInjectableCollision(value, 'repo:domain');
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

    const repoRegistryKey = `${repoNameKebabCase}-repo`;
    if (getInjectable(repoRegistryKey) !== undefined) {
        p.log.error(`Cannot create domain repo "${repoNameKebabCase}": "${repoRegistryKey}" already exists in registry.`);
        return;
    }

    const transactionalChoice = await selectRequired('Transactional or Non-Transactional?', [
        { value: 'transactional' as const, label: 'Transactional', hint: 'uses transaction connection (trx)' },
        { value: 'non-transactional' as const, label: 'Non-Transactional', hint: 'uses database pool (db)' },
    ]);
    const isTransactional = transactionalChoice === 'transactional';

    const repoOperation = await selectRequired('What type of operation will this repo perform?', [
        { value: 'write' as const, label: 'Write (insert/update)' },
        { value: 'read' as const, label: 'Read (select/query)' },
        { value: 'delete' as const, label: 'Delete' },
    ]);

    const context: TemplateContext = {
        domainNameKebabCase,
        domainNamePascalCase,
        domainNameCamelCase,
        repoNameKebabCase,
        repoNamePascalCase,
        repoNameCamelCase,
        repoOperation,
        useTransaction: isTransactional,
        generateUniqueKeyViolationErrorMap: coreConfig.generator.repo.generateUniqueKeyViolationErrorMap,
        generateForeignKeyViolationErrorMap: coreConfig.generator.repo.generateForeignKeyViolationErrorMap,
    };

    const s = p.spinner();
    s.start('Generating domain repo files...');

    configureEta(TEMPLATES_PATH);

    const repoPath = path.join(BACKEND_SRC_PATH, 'domains', domainNameKebabCase, 'repos', repoNameKebabCase);
    const internalsPath = path.join(BACKEND_SRC_PATH, '__internals__', 'domains', domainNameKebabCase, 'repos', repoNameKebabCase);

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
        type: isTransactional ? 'repo:domain:transactional' : 'repo:domain:non-transactional',
        domain: domainNameKebabCase,
    });

    saveRegistry();

    generateRepoTester({
        repoType: 'domain',
        domainName: domainNameKebabCase,
        repoName: repoNameKebabCase,
        isTransactional,
    });
    generateRepoTestFile({
        repoType: 'domain',
        domainName: domainNameKebabCase,
        repoName: repoNameKebabCase,
    });

    s.stop(`Successfully generated domain repo: ${domainNameKebabCase}/${repoNameKebabCase}`);
}
