import path from 'path';
import * as p from '@clack/prompts';
import { Node, SyntaxKind } from 'ts-morph';
import { resetDomainsCache, getAllDomains } from '@/core/cli/domains-registry/domains-registry.manager';
import { getAllInjectables } from '@/core/cli/injectables-registry/injectables-registry.manager';
import { createOptimizedProject } from '@/core/cli/utils/ts-morph/helpers.ts-morph';
import { selectAction } from '@/core/cli/utils/ui-utils';
import { formatInjectableType } from '@/core/cli/utils/type-utils';
import { BACKEND_SRC_PATH } from '@/core/cli/utils/cli-constants';


export async function listEndpoints(): Promise<void> {
    resetDomainsCache();
    const domains = getAllDomains().sort();

    if (domains.length === 0) {
        p.log.info('No domains found.');
        return;
    }

    const domainOptions = [
        { value: '*', label: 'All Domains' },
        ...domains.map(d => ({ value: d, label: d })),
    ];

    const selectedDomain = await selectAction('Select domain:', domainOptions);
    if (selectedDomain === null) {
        return;
    }

    const allInjectables = getAllInjectables();

    const endpointsByDomain = new Map<string, string[]>();

    for (const [name, config] of Object.entries(allInjectables)) {
        if (config.type === 'use-case:transactional' || config.type === 'use-case:non-transactional') {
            if ('domain' in config) {
                const domain = config.domain;
                if (endpointsByDomain.has(domain) === false) {
                    endpointsByDomain.set(domain, []);
                }
                endpointsByDomain.get(domain)!.push(name);
            }
        }
    }

    const domainsToShow = selectedDomain === '*'
        ? Array.from(endpointsByDomain.keys()).sort()
        : [selectedDomain];

    let totalToProcess = 0;
    for (const domain of domainsToShow) {
        const eps = endpointsByDomain.get(domain);
        totalToProcess += eps !== undefined ? eps.length : 0;
    }

    const s = p.spinner();
    s.start(`Reading endpoint configs (0/${totalToProcess})...`);

    const lines: string[] = [];
    let totalEndpoints = 0;
    let totalFileUploads = 0;
    let processed = 0;

    const project = createOptimizedProject();

    for (const domain of domainsToShow) {
        const endpointsOrUndefined = endpointsByDomain.get(domain);
        const endpoints = endpointsOrUndefined !== undefined ? endpointsOrUndefined : [];

        if (endpoints.length === 0) {
            continue;
        }

        if (selectedDomain === '*') {
            lines.push('');
            lines.push(`Domain: ${domain} (${endpoints.length} endpoint${endpoints.length === 1 ? '' : 's'})`);
        }

        endpoints.sort();

        for (let i = 0; i < endpoints.length; i++) {
            const useCaseName = endpoints[i];
            const isLast = i === endpoints.length - 1;
            const prefix = selectedDomain === '*' ? '  ' : '';
            const treeChar = isLast ? '└─' : '├─';

            const endpointConfig = allInjectables[useCaseName];
            const transactionality = endpointConfig !== undefined ? formatInjectableType(endpointConfig.type) : '???';

            const endpointId = useCaseName.endsWith('-use-case')
                ? useCaseName.slice(0, -9)
                : useCaseName;

            const routeConfigPath = path.join(
                BACKEND_SRC_PATH,
                'domains',
                domain,
                'endpoints',
                endpointId,
                `${endpointId}.route.config.ts`
            );

            let httpMethod = '???';
            let isFileUpload = false;

            try {
                const sourceFile = project.addSourceFileAtPath(routeConfigPath);

                const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

                for (const callExpr of callExpressions) {
                    const exprText = callExpr.getExpression().getText();
                    if (exprText === 'defineRouteConfig') {
                        const args = callExpr.getArguments();
                        if (args.length > 0 && Node.isObjectLiteralExpression(args[0])) {
                            const configObj = args[0];

                            const methodProp = configObj.getProperty('method');
                            if (methodProp !== undefined && Node.isPropertyAssignment(methodProp)) {
                                const init = methodProp.getInitializer();
                                if (init !== undefined) {
                                    httpMethod = init.getText().replace(/['"]/g, '').toUpperCase();
                                }
                            }

                            const isFileUploadProp = configObj.getProperty('isFileUpload');
                            if (isFileUploadProp !== undefined && Node.isPropertyAssignment(isFileUploadProp)) {
                                const init = isFileUploadProp.getInitializer();
                                if (init !== undefined && init.getText() === 'true') {
                                    isFileUpload = true;
                                    totalFileUploads++;
                                }
                            }
                        }
                        break;
                    }
                }

                project.removeSourceFile(sourceFile);
            }
            catch {
                //
            }

            const fileUploadIcon = isFileUpload ? '    📎 File Upload' : '';
            const paddedMethod = httpMethod.padEnd(7);
            const paddedTransactionality = transactionality.padEnd(22);
            lines.push(`${prefix}${treeChar} ${endpointId.padEnd(30)} ${paddedMethod} ${paddedTransactionality}${fileUploadIcon}`);
            totalEndpoints++;
            processed++;
            s.message(`Reading endpoint configs (${processed}/${totalToProcess})...`);
        }
    }

    s.stop('Done');

    const title = selectedDomain === '*'
        ? '📋 All Endpoints'
        : `📋 Endpoints in domain: ${selectedDomain}`;

    p.note(
        lines.join('\n'),
        title
    );

    const fileUploadNote = totalFileUploads > 0 ? ` (${totalFileUploads} with file upload)` : '';
    if (selectedDomain === '*') {
        p.log.info(`Total: ${totalEndpoints} endpoint${totalEndpoints === 1 ? '' : 's'} across ${domainsToShow.length} domain${domainsToShow.length === 1 ? '' : 's'}${fileUploadNote}`);
    }
    else {
        p.log.info(`Total: ${totalEndpoints} endpoint${totalEndpoints === 1 ? '' : 's'}${fileUploadNote}`);
    }
}
