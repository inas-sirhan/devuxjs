import * as p from '@clack/prompts';
import { getInjectable } from '@/core/cli/injectables-registry/injectables-registry.manager';
import { selectAction } from '@/core/cli/utils/ui-utils';
import { selectDomain, selectEndpoint } from '@/core/cli/utils/selectors';
import { addInjectableDependency, removeInjectableDependency } from '@/core/cli/operations/dependency-operations/injectable-dependencies';
import { getEndpointRepos } from '@/core/cli/utils/registry-helpers';
import { createEndpointRepo, deleteEndpointRepo } from '@/core/cli/operations/endpoint-operations/endpoint-repos';
import { addDomainRepoToEndpoint, removeDomainRepoFromEndpoint } from '@/core/cli/operations/endpoint-operations/endpoint-domain-repos';
import { addDomainServiceToEndpointOp, removeDomainServiceFromEndpointOp } from '@/core/cli/operations/endpoint-operations/endpoint-domain-services';
import { addAppServiceToEndpointOp, removeAppServiceFromEndpointOp } from '@/core/cli/operations/endpoint-operations/endpoint-app-services';

export async function manageEndpoint(): Promise<void> {
    const domain = await selectDomain();
    if (domain === null) {
        return;
    }

    const endpoint = await selectEndpoint(domain);
    if (endpoint === null) {
        return;
    }

    await manageEndpointDependencies(domain, endpoint);
}

export async function manageEndpointDependencies(domain: string, endpoint: string): Promise<void> {
    const useCaseRegistryName = `${endpoint}-use-case`;
    const useCaseConfig = getInjectable(useCaseRegistryName);
    const isTransactional = useCaseConfig?.type === 'use-case:transactional';

    type DepCategory = 'endpoint-repos' | 'domain-repos' | 'domain-services' | 'app-services';
    const options: { value: DepCategory; label: string }[] = [
        { value: 'endpoint-repos', label: 'Endpoint repos' },
        { value: 'domain-repos', label: 'Domain repos' },
        ...(isTransactional ? [
            { value: 'domain-services' as const, label: 'Domain services' },
        ] : []),
        { value: 'app-services', label: 'App services' },
    ];

    while (true) {
        const category = await selectAction(`Manage "${endpoint}" dependencies:`, options);

        if (category === null) {
            return;
        }

        switch (category) {
            case 'endpoint-repos':
                await manageEndpointReposMenu(domain, endpoint);
                break;
            case 'domain-repos':
                await manageDomainReposForEndpoint(domain, endpoint);
                break;
            case 'domain-services':
                await manageDomainServicesForEndpoint(domain, endpoint);
                break;
            case 'app-services':
                await manageAppServicesForEndpoint(domain, endpoint);
                break;
        }
    }
}

export async function manageEndpointReposMenu(domain: string, endpoint: string): Promise<void> {
    while (true) {
        const action = await selectAction('Endpoint repos - What do you want to do?', [
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
                await createEndpointRepo(domain, endpoint);
                break;
            case 'delete':
                await deleteEndpointRepoMenu(domain, endpoint);
                break;
            case 'rename':
                p.log.warning('Rename is currently disabled.');
                break;
            case 'manage':
                await manageEndpointRepoDependencies(domain, endpoint);
                break;
        }
    }
}

export async function deleteEndpointRepoMenu(domain: string, endpoint: string): Promise<void> {
    const repos = getEndpointRepos(domain, endpoint);

    if (repos.length === 0) {
        p.log.info('No endpoint repos to delete.');
        return;
    }

    const selectedRepo = await selectAction('Select endpoint repo to delete:', repos.map(r => ({ value: r, label: r })));
    if (selectedRepo === null) {
        return;
    }

    await deleteEndpointRepo(domain, endpoint, selectedRepo);
}

export async function manageEndpointRepoDependencies(domain: string, endpoint: string): Promise<void> {
    const repos = getEndpointRepos(domain, endpoint);

    if (repos.length === 0) {
        p.log.info('No endpoint repos found. Create one first.');
        return;
    }

    const selectedRepo = await selectAction('Select endpoint repo to manage:', repos.map(r => ({
        value: r,
        label: r.replace(/-repo$/, '')
    })));
    if (selectedRepo === null) {
        return;
    }

    const repoName = selectedRepo;

    while (true) {
        const action = await selectAction(`Manage "${(selectedRepo).replace(/-repo$/, '')}" dependencies - What do you want to do?`, [
            { value: 'add', label: 'Add dependency' },
            { value: 'remove', label: 'Remove dependency' },
        ]);

        if (action === null) {
            return;
        }

        switch (action) {
            case 'add':
                await addInjectableDependency(repoName);
                break;
            case 'remove':
                await removeInjectableDependency(repoName);
                break;
        }
    }
}

export async function manageDomainReposForEndpoint(domain: string, endpoint: string): Promise<void> {
    while (true) {
        const action = await selectAction('Domain repos - What do you want to do?', [
            { value: 'add', label: 'Add' },
            { value: 'remove', label: 'Remove' },
        ]);

        if (action === null) {
            return;
        }

        switch (action) {
            case 'add':
                await addDomainRepoToEndpoint(domain, endpoint);
                break;
            case 'remove':
                await removeDomainRepoFromEndpoint(domain, endpoint);
                break;
        }
    }
}

export async function manageDomainServicesForEndpoint(domain: string, endpoint: string): Promise<void> {
    while (true) {
        const action = await selectAction('Domain services - What do you want to do?', [
            { value: 'add', label: 'Add' },
            { value: 'remove', label: 'Remove' },
        ]);

        if (action === null) {
            return;
        }

        switch (action) {
            case 'add':
                await addDomainServiceToEndpointOp(domain, endpoint);
                break;
            case 'remove':
                await removeDomainServiceFromEndpointOp(domain, endpoint);
                break;
        }
    }
}

export async function manageAppServicesForEndpoint(domain: string, endpoint: string): Promise<void> {
    while (true) {
        const action = await selectAction('App services - What do you want to do?', [
            { value: 'add', label: 'Add' },
            { value: 'remove', label: 'Remove' },
        ]);

        if (action === null) {
            return;
        }

        switch (action) {
            case 'add':
                await addAppServiceToEndpointOp(domain, endpoint);
                break;
            case 'remove':
                await removeAppServiceFromEndpointOp(domain, endpoint);
                break;
        }
    }
}
