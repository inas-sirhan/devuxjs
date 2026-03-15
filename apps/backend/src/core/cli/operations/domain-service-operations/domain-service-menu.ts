import * as p from '@clack/prompts';
import { selectAction } from '@/core/cli/utils/ui-utils';
import { selectDomain, selectDomainService } from '@/core/cli/utils/selectors';
import { addInjectableDependency, removeInjectableDependency } from '@/core/cli/operations/dependency-operations/injectable-dependencies';
import { createDomainService } from '@/core/cli/operations/domain-service-operations/create-domain-service';
import { deleteDomainService } from '@/core/cli/operations/domain-service-operations/delete-domain-service';
import { getDomainServiceRepos, createDomainServiceRepo, deleteDomainServiceRepo } from '@/core/cli/operations/domain-service-operations/domain-service-repos';


export async function domainServicesMenu(): Promise<void> {
    while (true) {
        const action = await selectAction('Domain Services - What do you want to do?', [
            { value: 'create', label: 'Create' },
            { value: 'rename', label: 'Rename', hint: 'currently disabled' },
            { value: 'delete', label: 'Delete' },
            { value: 'manage', label: 'Manage dependencies' },
            { value: 'manage-repos', label: 'Manage service repos' },
        ]);

        if (action === null) {
            return;
        }

        switch (action) {
            case 'create':
                await createDomainService();
                break;
            case 'rename':
                p.log.warning('Rename is currently disabled.');
                break;
            case 'delete':
                await deleteDomainService();
                break;
            case 'manage':
                await manageDomainServiceDependencies();
                break;
            case 'manage-repos':
                await manageDomainServiceRepos();
                break;
        }
    }
}

async function manageDomainServiceDependencies(): Promise<void> {
    const domain = await selectDomain();
    if (domain === null) {
        return;
    }

    const service = await selectDomainService(domain);
    if (service === null) {
        return;
    }

    while (true) {
        const action = await selectAction(`Manage "${service}" dependencies - What do you want to do?`, [
            { value: 'add', label: 'Add dependency' },
            { value: 'remove', label: 'Remove dependency' },
        ]);

        if (action === null) {
            return;
        }

        switch (action) {
            case 'add':
                await addInjectableDependency(service);
                break;
            case 'remove':
                await removeInjectableDependency(service);
                break;
        }
    }
}

async function manageDomainServiceRepos(): Promise<void> {
    const domain = await selectDomain();
    if (domain === null) {
        return;
    }

    const service = await selectDomainService(domain);
    if (service === null) {
        return;
    }

    while (true) {
        const action = await selectAction(`Manage "${service}" repos - What do you want to do?`, [
            { value: 'create', label: 'Create repo' },
            { value: 'delete', label: 'Delete repo' },
            { value: 'manage-deps', label: 'Manage repo dependencies' },
        ]);

        if (action === null) {
            return;
        }

        switch (action) {
            case 'create':
                await createDomainServiceRepo(domain, service);
                break;
            case 'delete':
                await deleteDomainServiceRepo(domain, service);
                break;
            case 'manage-deps':
                await manageDomainServiceRepoDependencies(service);
                break;
        }
    }
}

async function manageDomainServiceRepoDependencies(serviceName: string): Promise<void> {
    const repos = getDomainServiceRepos(serviceName);

    if (repos.length === 0) {
        p.log.info('No service repos found. Create one first.');
        return;
    }

    const selectedRepo = await selectAction('Select service repo to manage:', repos.map(r => ({
        value: r,
        label: r,
    })));

    if (selectedRepo === null) {
        return;
    }

    const repoRegistryName = `${selectedRepo}-repo`;

    while (true) {
        const action = await selectAction(`Manage "${selectedRepo}" dependencies - What do you want to do?`, [
            { value: 'add', label: 'Add dependency' },
            { value: 'remove', label: 'Remove dependency' },
        ]);

        if (action === null) {
            return;
        }

        switch (action) {
            case 'add':
                await addInjectableDependency(repoRegistryName);
                break;
            case 'remove':
                await removeInjectableDependency(repoRegistryName);
                break;
        }
    }
}
