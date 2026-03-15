import * as p from '@clack/prompts';
import { resetDomainsCache, getAllDomains } from '@/core/cli/domains-registry/domains-registry.manager';
import { getAllInjectables } from '@/core/cli/injectables-registry/injectables-registry.manager';
import { type InjectableConfig } from '@/core/cli/injectables-registry/injectables-registry.types';
import { selectAction } from '@/core/cli/utils/ui-utils';


export async function listDomainRepos(): Promise<void> {
    resetDomainsCache();
    const domains = getAllDomains().sort();

    if (domains.length === 0) {
        p.log.warn('No domains found. Please create a domain first.');
        return;
    }

    const domainOptions = [
        { value: '*', label: 'All domains' },
        ...domains.map(d => ({ value: d, label: d }))
    ];

    const selectedDomain = await selectAction('Which domain?', domainOptions);
    if (selectedDomain === null) {
        return;
    }

    const allInjectables = getAllInjectables();

    const reposByDomain = new Map<string, Array<{ name: string; config: InjectableConfig }>>();

    for (const [name, config] of Object.entries(allInjectables)) {
        if (config.type !== 'repo:domain:transactional' && config.type !== 'repo:domain:non-transactional') {
            continue;
        }
        if (('domain' in config) === false) {
            continue;
        }

        const domain = config.domain as string;
        if (selectedDomain !== '*' && domain !== selectedDomain) {
            continue;
        }

        if (reposByDomain.has(domain) === false) {
            reposByDomain.set(domain, []);
        }
        reposByDomain.get(domain)!.push({ name, config });
    }

    if (reposByDomain.size === 0) {
        const msg = selectedDomain === '*'
            ? 'No domain repos found.'
            : `No domain repos found in domain: ${selectedDomain}`;
        p.log.warn(msg);
        return;
    }

    const lines: string[] = [];
    let totalRepos = 0;

    const sortedDomains = Array.from(reposByDomain.keys()).sort();

    for (const domain of sortedDomains) {
        const repos = reposByDomain.get(domain)!.sort((a, b) => a.name.localeCompare(b.name));

        if (selectedDomain === '*') {
            lines.push(`\n${domain}/`);
        }

        for (const { name } of repos) {
            const prefix = selectedDomain === '*' ? '  ' : '';
            lines.push(`${prefix}  • ${name}`);
            totalRepos++;
        }
    }

    const title = selectedDomain === '*'
        ? '📦 All Domain Repos'
        : `📦 Domain Repos in: ${selectedDomain}`;

    p.note(lines.join('\n'), title);

    if (selectedDomain === '*') {
        p.log.info(`Total: ${totalRepos} domain repo${totalRepos === 1 ? '' : 's'} across ${sortedDomains.length} domain${sortedDomains.length === 1 ? '' : 's'}`);
    }
    else {
        p.log.info(`Total: ${totalRepos} domain repo${totalRepos === 1 ? '' : 's'}`);
    }
}

export async function listDomainServices(): Promise<void> {
    resetDomainsCache();
    const domains = getAllDomains().sort();

    if (domains.length === 0) {
        p.log.warn('No domains found. Please create a domain first.');
        return;
    }

    const domainOptions = [
        { value: '*', label: 'All domains' },
        ...domains.map(d => ({ value: d, label: d }))
    ];

    const selectedDomain = await selectAction('Which domain?', domainOptions);
    if (selectedDomain === null) {
        return;
    }

    const allInjectables = getAllInjectables();

    const servicesByDomain = new Map<string, Array<{ name: string; config: InjectableConfig }>>();

    for (const [name, config] of Object.entries(allInjectables)) {
        if (config.type !== 'service:domain') {
            continue;
        }
        if (('domain' in config) === false) {
            continue;
        }

        const domain = config.domain as string;
        if (selectedDomain !== '*' && domain !== selectedDomain) {
            continue;
        }

        if (servicesByDomain.has(domain) === false) {
            servicesByDomain.set(domain, []);
        }
        servicesByDomain.get(domain)!.push({ name, config });
    }

    if (servicesByDomain.size === 0) {
        const msg = selectedDomain === '*'
            ? 'No domain services found.'
            : `No domain services found in domain: ${selectedDomain}`;
        p.log.warn(msg);
        return;
    }

    const lines: string[] = [];
    let totalServices = 0;

    const sortedDomains = Array.from(servicesByDomain.keys()).sort();

    for (const domain of sortedDomains) {
        const services = servicesByDomain.get(domain)!.sort((a, b) => a.name.localeCompare(b.name));

        if (selectedDomain === '*') {
            lines.push(`\n${domain}/`);
        }

        for (const { name } of services) {
            const prefix = selectedDomain === '*' ? '  ' : '';
            lines.push(`${prefix}  • ${name}`);
            totalServices++;
        }
    }

    const title = selectedDomain === '*'
        ? '⚙️ All Domain Services'
        : `⚙️ Domain Services in: ${selectedDomain}`;

    p.note(lines.join('\n'), title);

    if (selectedDomain === '*') {
        p.log.info(`Total: ${totalServices} domain service${totalServices === 1 ? '' : 's'} across ${sortedDomains.length} domain${sortedDomains.length === 1 ? '' : 's'}`);
    }
    else {
        p.log.info(`Total: ${totalServices} domain service${totalServices === 1 ? '' : 's'}`);
    }
}

export function listAppServices(): void {
    const allInjectables = getAllInjectables();

    const appServices = Object.entries(allInjectables)
        .filter(([, config]) => config.type === 'service:app')
        .sort(([a], [b]) => a.localeCompare(b));

    if (appServices.length === 0) {
        p.log.warn('No app services found.');
        return;
    }

    const lines: string[] = [];

    for (const [name, config] of appServices) {
        const scopeLabel = config.isGlobal ? ' [global]' : ' [request-scoped]';
        lines.push(`  • ${name}${scopeLabel}`);
    }

    p.note(lines.join('\n'), '🔧 App Services');
    p.log.info(`Total: ${appServices.length} app service${appServices.length === 1 ? '' : 's'}`);
}
