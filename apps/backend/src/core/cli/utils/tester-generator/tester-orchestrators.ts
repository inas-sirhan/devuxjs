import { getInjectable, getAllInjectables } from '@/core/cli/injectables-registry/injectables-registry.manager';
import { BASE_CLASS_IDS } from '@/core/cli/utils/type-utils';
import { generateUseCaseTester } from '@/core/cli/utils/tester-generator/use-case-tester-generator';
import { generateRepoTester } from '@/core/cli/utils/tester-generator/repo-tester-generator';
import { generateDomainServiceTester } from '@/core/cli/utils/tester-generator/service-tester-generators';
import { generateAppServiceTester } from '@/core/cli/utils/tester-generator/service-tester-generators';


export function generateTesterForInjectable(injectableName: string): void {
    const config = getInjectable(injectableName);
    if (config === undefined) {
        throw new Error(`Injectable "${injectableName}" not found in registry`);
    }

    const type = config.type;

    if (type === 'use-case:transactional' || type === 'use-case:non-transactional') {
        const endpointId = injectableName.replace(/-use-case$/, '');
        generateUseCaseTester(config.domain, endpointId);
    }
    else {
        if (type === 'repo:endpoint:transactional' || type === 'repo:endpoint:non-transactional') {
            const repoName = injectableName.replace(/-repo$/, '');
            const endpointId = config.dependents[0]?.replace(/-use-case$/, '');
            if (endpointId !== undefined && endpointId !== '') {
                generateRepoTester({
                    repoType: 'endpoint',
                    domainName: config.domain,
                    repoName,
                    isTransactional: type === 'repo:endpoint:transactional',
                    endpointId,
                });
            }
        }
        else {
            if (type === 'repo:domain:transactional' || type === 'repo:domain:non-transactional') {
                const repoName = injectableName.replace(/-repo$/, '');
                generateRepoTester({
                    repoType: 'domain',
                    domainName: config.domain,
                    repoName,
                    isTransactional: type === 'repo:domain:transactional',
                });
            }
            else {
                if (type === 'repo:service:domain') {
                    const repoName = injectableName.replace(/-repo$/, '');
                    const serviceName = config.dependents[0];
                    if (serviceName !== undefined && serviceName !== '') {
                        generateRepoTester({
                            repoType: 'service',
                            domainName: config.domain,
                            repoName,
                            isTransactional: true,
                            serviceName,
                        });
                    }
                }
                else {
                    if (type === 'service:domain') {
                        const serviceName = injectableName.replace(/-service$/, '');
                        generateDomainServiceTester({ domainName: config.domain, serviceName });
                    }
                    else {
                        if (type === 'service:app') {
                            const serviceName = injectableName.replace(/-app-service$/, '');
                            generateAppServiceTester({ serviceName, isGlobal: config.isGlobal });
                        }
                    }
                }
            }
        }
    }
}


export function regenerateTestersForDependents(injectableName: string, visited: Set<string> = new Set()): void {
    if (visited.has(injectableName) === true) {
        return;
    }
    visited.add(injectableName);

    const config = getInjectable(injectableName);
    if (config === undefined) {
        throw new Error(`Injectable "${injectableName}" not found in registry`);
    }

    const dependents = 'dependents' in config ? config.dependents : [];
    if (dependents.length === 0) {
        return;
    }

    for (const dependentName of dependents) {
        generateTesterForInjectable(dependentName);
        regenerateTestersForDependents(dependentName, visited);
    }
}


export function regenerateTestersForBaseClassDependents(baseClassId: string): void {
    const allInjectables = getAllInjectables();

    let targetTypes: string[] = [];
    if (baseClassId === BASE_CLASS_IDS.USE_CASE_BASE) {
        targetTypes = ['use-case:transactional', 'use-case:non-transactional'];
    }
    else {
        if (baseClassId === BASE_CLASS_IDS.REPO_BASE) {
            targetTypes = ['repo:endpoint:transactional', 'repo:endpoint:non-transactional', 'repo:domain:transactional', 'repo:domain:non-transactional', 'repo:service:domain'];
        }
        else {
            if (baseClassId === BASE_CLASS_IDS.DOMAIN_SERVICE_BASE) {
                targetTypes = ['service:domain'];
            }
        }
    }

    if (targetTypes.length === 0) {
        return;
    }

    for (const [name, config] of Object.entries(allInjectables)) {
        if (targetTypes.includes(config.type) === true) {
            generateTesterForInjectable(name);
        }
    }
}
