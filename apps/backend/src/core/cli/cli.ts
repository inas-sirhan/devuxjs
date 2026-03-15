import * as p from '@clack/prompts';
import { resetRegistryCache } from '@/core/cli/injectables-registry/injectables-registry.manager';
import { resetEndpointIdsCache } from '@/core/cli/endpoints-ids-registry/endpoints-ids-registry.manager';
import { runVisualizer } from '@/core/cli/visualizer/visualize';
import { selectAction, selectRequired } from '@/core/cli/utils/ui-utils';
import { manageEndpoint } from '@/core/cli/operations/endpoint-operations/manage-endpoint';
import { createEndpoint } from '@/core/cli/operations/endpoint-operations/create-endpoint';
import { deleteEndpoint } from '@/core/cli/operations/endpoint-operations/delete-endpoint';
import { domainServicesMenu } from '@/core/cli/operations/domain-service-operations/domain-service-menu';
import { appServicesMenu } from '@/core/cli/operations/app-service-operations';
import { domainReposMenu } from '@/core/cli/operations/domain-repo-operations';
import { createDomain, deleteDomain } from '@/core/cli/operations/domain-operations';
import { listInspectMenu } from '@/core/cli/operations/list-operations/list-menus';
import { baseClassesMenu } from '@/core/cli/operations/dependency-operations/base-class-dependencies';


async function main() {

    while (true) {
        resetRegistryCache();
        resetEndpointIdsCache();

        const category = await selectRequired('What do you want to work with?', [
            { value: 'domains' as const, label: 'Domains' },
            { value: 'endpoints' as const, label: 'Endpoints' },
            { value: 'domain-repos' as const, label: 'Domain Repos' },
            { value: 'domain-services' as const, label: 'Domain Services' },
            { value: 'app-services' as const, label: 'App Services' },
            { value: 'base-classes' as const, label: 'Base Classes' },
            { value: 'list-&-inspect' as const, label: 'List & Inspect' },
            { value: 'visualize' as const, label: 'Visualize', hint: 'Open endpoints dependency graph in browser' },
        ]);

        try {
            switch (category) {
                case 'domains':
                    await domainsMenu();
                    break;
                case 'endpoints':
                    await endpointsMenu();
                    break;
                case 'domain-repos':
                    await domainReposMenu();
                    break;
                case 'domain-services':
                    await domainServicesMenu();
                    break;
                case 'app-services':
                    await appServicesMenu();
                    break;
                case 'base-classes':
                    await baseClassesMenu();
                    break;
                case 'list-&-inspect':
                    await listInspectMenu();
                    break;
                case 'visualize':
                    runVisualize();
                    break;
            }
        }
        catch (error) {
            if (error instanceof Error) {
                p.log.error(error.message);
            } 
            else {
                console.error('❌', error);
            }
            console.log('');
            p.log.error('An unexpected error happened. Please undo all changes carefully (git restore/clean..) and retry.');
            p.outro('CLI stopped.');
            process.exit(1);
        }

        console.log('');
    }
}


async function domainsMenu(): Promise<void> {
    while (true) {
        const action = await selectAction('Domains - What do you want to do?', [
            { value: 'create', label: 'Create' },
            { value: 'rename', label: 'Rename', hint: 'currently disabled' },
            { value: 'delete', label: 'Delete' },
        ]);

        if (action === null) {
            return;
        }

        switch (action) {
            case 'create':
                await createDomain();
                break;
            case 'rename':
                p.log.warning('Rename is currently disabled.');
                break;
            case 'delete':
                await deleteDomain();
                break;
        }
    }
}


async function endpointsMenu(): Promise<void> {
    while (true) {
        const action = await selectAction('Endpoints - What do you want to do?', [
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
                await createEndpoint();
                break;
            case 'rename':
                p.log.warning('Rename is currently disabled.');
                break;
            case 'delete':
                await deleteEndpoint();
                break;
            case 'manage':
                await manageEndpoint();
                break;
        }
    }
}

function runVisualize(): void {
    const s = p.spinner();
    s.start('Generating visualization...');

    runVisualizer();

    s.stop('Visualization generated');
    p.log.success('Opened in browser');
}


await main();
