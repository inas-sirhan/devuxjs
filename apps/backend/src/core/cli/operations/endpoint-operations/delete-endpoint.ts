import path from 'path';
import fs from 'fs';
import * as p from '@clack/prompts';
import { kebabToPascalCase } from '@/core/cli/utils/case-converter';
import { createOptimizedProject } from '@/core/cli/utils/ts-morph/helpers.ts-morph';
import { Node } from 'ts-morph';
import { getInjectable, removeInjectable, saveRegistry } from '@/core/cli/injectables-registry/injectables-registry.manager';
import { removeEndpointId, saveEndpointIds } from '@/core/cli/endpoints-ids-registry/endpoints-ids-registry.manager';
import { confirmAction } from '@/core/cli/utils/ui-utils';
import { selectDomain, selectEndpoint } from '@/core/cli/utils/selectors';
import { BACKEND_SRC_PATH, SHARED_PATH } from '@/core/cli/utils/cli-constants';

export async function deleteEndpoint(): Promise<void> {
    const domain = await selectDomain();
    if (domain === null) {
        return;
    }

    const endpoint = await selectEndpoint(domain, 'Select endpoint to delete:');
    if (endpoint === null) {
        return;
    }

    const endpointIdKebab = endpoint;

    const useCaseName = `${endpointIdKebab}-use-case`;
    const useCaseConfig = getInjectable(useCaseName)!;

    const confirmed = await confirmAction(`Are you sure you want to delete endpoint "${domain}/${endpointIdKebab}"?`);
    if (confirmed === false) {
        p.log.info('Deletion cancelled.');
        return;
    }

    const s = p.spinner();
    s.start('Deleting endpoint...');

    const endpointPath = path.join(BACKEND_SRC_PATH, 'domains', domain, 'endpoints', endpointIdKebab);
    fs.rmSync(endpointPath, { recursive: true, force: true });

    const internalsEndpointPath = path.join(BACKEND_SRC_PATH, '__internals__', 'domains', domain, 'endpoints', endpointIdKebab);
    fs.rmSync(internalsEndpointPath, { recursive: true, force: true });

    const sharedEndpointPath = path.join(SHARED_PATH, 'src', 'shared-app', 'domains', domain, 'zod-schemas', endpointIdKebab);
    fs.rmSync(sharedEndpointPath, { recursive: true, force: true });

    const endpointIdPascal = kebabToPascalCase(endpointIdKebab);

    await removeSetupEndpointCall(endpointIdPascal);

    const endpointRepos = useCaseConfig.dependencies
        .map(depName => ({ name: depName, config: getInjectable(depName) }))
        .filter((dep): dep is { name: string; config: NonNullable<typeof dep.config> } =>
            dep.config?.type === 'repo:endpoint:transactional' ||
            dep.config?.type === 'repo:endpoint:non-transactional'
        );

    removeInjectable(useCaseName);
    for (const repo of endpointRepos) {
        removeInjectable(repo.name);
    }

    removeEndpointId(endpointIdKebab);

    saveRegistry();
    saveEndpointIds();

    s.stop(`Successfully deleted endpoint: ${domain}/${endpointIdKebab}`);
}


async function removeSetupEndpointCall(endpointIdPascal: string): Promise<void> {
    const setupFilePath = path.join(BACKEND_SRC_PATH, '__internals__', 'domains', 'domains.endpoints.setup.ts');

    if (fs.existsSync(setupFilePath) === false) {
        throw new Error('domains.endpoints.setup.ts not found');
    }

    const project = createOptimizedProject();
    const sourceFile = project.addSourceFileAtPath(setupFilePath);

    const setupFunctionName = `setup${endpointIdPascal}Endpoint`;
    const importToRemove = sourceFile.getImportDeclaration((decl) => {
        const namedImports = decl.getNamedImports();
        return namedImports.some(imp => imp.getName() === setupFunctionName);
    });

    if (importToRemove !== undefined) {
        importToRemove.remove();
    }

    const setupAllFunction = sourceFile.getFunction('setupAllDomainsEndpoints');
    if (setupAllFunction !== undefined) {
        const body = setupAllFunction.getBody();
        if (Node.isBlock(body) === true) {
            for (const statement of body.getStatements()) {
                if (statement.getText().includes(setupFunctionName)) {
                    statement.remove();
                    break;
                }
            }
        }
    }

    await sourceFile.save();
}
