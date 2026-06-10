import path from 'path';
import fs from 'fs';
import * as p from '@clack/prompts';
import { getInjectable, saveRegistry } from '@/core/cli/injectables-registry/injectables-registry.manager';
import { removeInjectable } from '@/core/cli/injectables-registry/injectables-registry.updater';
import { confirmAction } from '@/core/cli/utils/ui-utils';
import { selectDomain, selectDomainService } from '@/core/cli/utils/selectors';
import { BACKEND_SRC_PATH } from '@/core/cli/utils/cli-constants';
import { getDomainServiceRepos } from '@/core/cli/operations/domain-service-operations/domain-service-repos';


export async function deleteDomainService(): Promise<void> {
    const domain = await selectDomain();
    if (domain === null) {
        return;
    }

    const service = await selectDomainService(domain);
    if (service === null) {
        return;
    }

    const serviceConfig = getInjectable(service);
    if (serviceConfig === undefined) {
        p.log.error(`Service "${service}" not found in registry.`);
        return;
    }

    if ('dependents' in serviceConfig && serviceConfig.dependents.length > 0) {
        p.log.error(`Cannot delete "${service}": It is used by ${serviceConfig.dependents.length} injectable(s):`);
        for (const dependent of serviceConfig.dependents) {
            p.log.step(`- ${dependent}`);
        }
        p.log.info('Remove this service from each dependent first using "Manage dependencies", then try again.');
        return;
    }

    const serviceRepos = getDomainServiceRepos(service);

    const confirmed = await confirmAction(`Are you sure you want to delete "${service}"${serviceRepos.length > 0 ? ` and its ${serviceRepos.length} repo(s)` : ''}?`);
    if (confirmed === false) {
        p.log.info('Deletion cancelled.');
        return;
    }

    const s = p.spinner();
    s.start('Deleting domain service...');

    removeInjectable(service);
    for (const repoName of serviceRepos) {
        removeInjectable(`${repoName}-repo`);
    }
    saveRegistry();

    for (const repoName of serviceRepos) {
        fs.rmSync(path.join(BACKEND_SRC_PATH, 'domains', domain, 'services', service, 'repos', repoName), { recursive: true, force: true });
        fs.rmSync(path.join(BACKEND_SRC_PATH, '__internals__', 'domains', domain, 'services', service, 'repos', repoName), { recursive: true, force: true });
    }
    fs.rmSync(path.join(BACKEND_SRC_PATH, 'domains', domain, 'services', service), { recursive: true, force: true });
    fs.rmSync(path.join(BACKEND_SRC_PATH, '__internals__', 'domains', domain, 'services', service), { recursive: true, force: true });

    s.stop(`Successfully deleted domain service: ${domain}/${service}`);
}
