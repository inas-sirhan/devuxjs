import path from 'path';
import fs from 'fs';
import * as p from '@clack/prompts';
import { kebabToPascalCase, kebabToCamelCase } from '@/core/cli/utils/case-converter';
import { validateNewDomainName } from '@/core/cli/utils/validators';
import { configureEta, renderAndSave, createDirectory, createDirectoryWithGitkeep, type TemplateContext } from '@/core/cli/utils/file-generator';
import { generateDomainSharedAppFiles } from '@/core/cli/utils/shared-app-generator';
import { addDomain, removeDomain, saveDomains } from '@/core/cli/domains-registry/domains-registry.manager';
import { promptRequiredText, confirmAction } from '@/core/cli/utils/ui-utils';
import { selectDomain } from '@/core/cli/utils/selectors';
import { getEndpointsForDomain, getDomainReposForDomain, getDomainServicesForDomain } from '@/core/cli/utils/registry-helpers';
import { BACKEND_SRC_PATH, TEMPLATES_PATH, SHARED_PATH } from '@/core/cli/utils/cli-constants';
import { coreConfig } from '@/infrastructure/core/core.config';


export async function createDomain(): Promise<void> {
    const domainName = await promptRequiredText(
        'Enter domain name (kebab-case):',
        'Domain name is required',
        (value) => {
            const result = validateNewDomainName(value);
            if (result.valid === false) {
                return result.error;
            }
            return undefined;
        }
    );

    if (domainName === null) {
        return;
    }

    const domainNameKebabCase = domainName;
    const domainNamePascalCase = kebabToPascalCase(domainNameKebabCase);
    const domainNameCamelCase = kebabToCamelCase(domainNameKebabCase);

    const s = p.spinner();
    s.start('Generating domain files...');

    const domainBasePath = path.join(BACKEND_SRC_PATH, 'domains', domainNameKebabCase);
    createDirectory(domainBasePath);
    createDirectoryWithGitkeep(path.join(domainBasePath, 'endpoints'));
    createDirectoryWithGitkeep(path.join(domainBasePath, 'repos'));
    createDirectoryWithGitkeep(path.join(domainBasePath, 'services'));

    const internalsBasePath = path.join(BACKEND_SRC_PATH, '__internals__', 'domains', domainNameKebabCase);
    createDirectory(internalsBasePath);
    createDirectory(path.join(internalsBasePath, 'endpoints'));
    createDirectory(path.join(internalsBasePath, 'repos'));
    createDirectory(path.join(internalsBasePath, 'services'));

    configureEta(TEMPLATES_PATH);

    generateDomainSharedAppFiles({
        domainNameKebabCase,
        domainNamePascalCase,
        domainNameCamelCase,
    });

    const domainHelperPath = path.join(
        internalsBasePath,
        `${domainNameKebabCase}.route.ts`
    );

    const domainContext: TemplateContext = {
        domainNameKebabCase,
        domainNamePascalCase,
        domainNameCamelCase,
    };

    renderAndSave('domain.route.ts.eta', domainContext, domainHelperPath);

    if (coreConfig.assertNoMutationsInInternalSchemas === true) {
        const internalBaseSchemaPath = path.join(
            domainBasePath,
            `${domainNameKebabCase}.internal.base.zod.schema.ts`
        );
        renderAndSave('internal.base.zod.schema.ts.eta', domainContext, internalBaseSchemaPath);
    }

    const internalUtilsPath = path.join(
        domainBasePath,
        `${domainNameKebabCase}.internal.utils.ts`
    );
    renderAndSave('domain.internal.utils.ts.eta', domainContext, internalUtilsPath);

    addDomain(domainNameKebabCase);
    saveDomains();

    s.stop(`Successfully generated domain: ${domainNameKebabCase}`);
}


export async function deleteDomain(): Promise<void> {
    const domainKebab = await selectDomain('Select domain to delete:');
    if (domainKebab === null) {
        return;
    }

    const endpoints = getEndpointsForDomain(domainKebab);
    if (endpoints.length > 0) {
        p.note(
            endpoints.map(ep => `- ${ep}`).join('\n'),
            `Domain has ${endpoints.length} endpoint(s)`
        );
        p.log.error('Cannot delete domain with existing endpoints. Delete all endpoints first.');
        return;
    }

    const repos = getDomainReposForDomain(domainKebab);
    if (repos.length > 0) {
        p.note(
            repos.map(repo => `- ${repo}`).join('\n'),
            `Domain has ${repos.length} repo(s)`
        );
        p.log.error('Cannot delete domain with existing domain repos. Delete all domain repos first.');
        return;
    }

    const services = getDomainServicesForDomain(domainKebab);
    if (services.length > 0) {
        p.note(
            services.map(service => `- ${service}`).join('\n'),
            `Domain has ${services.length} service(s)`
        );
        p.log.error('Cannot delete domain with existing domain services. Delete all domain services first.');
        return;
    }

    const confirmed = await confirmAction(`Are you sure you want to delete domain "${domainKebab}"?`);
    if (confirmed === false) {
        p.log.info('Deletion cancelled.');
        return;
    }

    const s = p.spinner();
    s.start('Deleting domain...');


    const domainPath = path.join(BACKEND_SRC_PATH, 'domains', domainKebab);
    fs.rmSync(domainPath, { recursive: true, force: true });

    const internalsPath = path.join(BACKEND_SRC_PATH, '__internals__', 'domains', domainKebab);
    fs.rmSync(internalsPath, { recursive: true, force: true });

    const sharedDomainPath = path.join(SHARED_PATH, 'src', 'shared-app', 'domains', domainKebab);
    fs.rmSync(sharedDomainPath, { recursive: true, force: true });

    removeDomain(domainKebab);
    saveDomains();

    s.stop(`Successfully deleted domain: ${domainKebab}`);
}
