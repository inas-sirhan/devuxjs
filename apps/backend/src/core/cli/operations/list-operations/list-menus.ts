import * as p from '@clack/prompts';
import { resetDomainsCache, getAllDomains } from '@/core/cli/domains-registry/domains-registry.manager';
import { selectAction } from '@/core/cli/utils/ui-utils';
import { listEndpoints } from '@/core/cli/operations/list-operations/list-endpoints';
import { listDomainRepos, listDomainServices, listAppServices } from '@/core/cli/operations/list-operations/list-injectables';
import { inspectDependenciesAndDependents } from '@/core/cli/operations/list-operations/inspect-injectable';


export async function listInspectMenu(): Promise<void> {
    while (true) {
        const action = await selectAction('List & Inspect - What do you want to do?', [
            { value: 'list', label: 'List' },
            { value: 'inspect', label: 'Inspect' },
        ]);

        if (action === null) {
            return;
        }

        switch (action) {
            case 'list':
                await listMenu();
                break;
            case 'inspect':
                await inspectDependenciesAndDependents();
                break;
        }

        console.log('');
    }
}

async function listMenu(): Promise<void> {
    while (true) {
        const action = await selectAction('List - What do you want to list?', [
            { value: 'list-domains', label: 'List domains' },
            { value: 'list-endpoints', label: 'List endpoints' },
            { value: 'list-domain-repos', label: 'List domain repos' },
            { value: 'list-domain-services', label: 'List domain services' },
            { value: 'list-app-services', label: 'List app services' },
        ]);

        if (action === null) {
            return;
        }

        switch (action) {
            case 'list-domains':
                listDomains();
                break;
            case 'list-endpoints':
                await listEndpoints();
                break;
            case 'list-domain-repos':
                await listDomainRepos();
                break;
            case 'list-domain-services':
                await listDomainServices();
                break;
            case 'list-app-services':
                listAppServices();
                break;
        }

        console.log('');
    }
}

function listDomains(): void {
    resetDomainsCache();
    const domains = getAllDomains().sort();

    if (domains.length === 0) {
        p.log.info('No domains found.');
        return;
    }

    const lines: string[] = [];

    for (let i = 0; i < domains.length; i++) {
        const isLast = i === domains.length - 1;
        const prefix = isLast ? '└─' : '├─';
        lines.push(`${prefix} ${domains[i]}`);
    }

    p.note(
        lines.join('\n'),
        `📋 Domains`
    );

    p.log.info(`Total: ${domains.length} domain${domains.length === 1 ? '' : 's'}`);
}
