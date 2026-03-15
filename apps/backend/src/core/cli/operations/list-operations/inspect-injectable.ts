import * as p from '@clack/prompts';
import { resetDomainsCache, getAllDomains } from '@/core/cli/domains-registry/domains-registry.manager';
import { getAllInjectables } from '@/core/cli/injectables-registry/injectables-registry.manager';
import { selectAction } from '@/core/cli/utils/ui-utils';
import { formatInjectableType, getDependenciesFromBaseClasses } from '@/core/cli/utils/type-utils';


export async function inspectDependenciesAndDependents(): Promise<void> {
    const allInjectables = getAllInjectables();

    const groupedInjectables = new Map<string, string[]>();

    for (const [name, config] of Object.entries(allInjectables)) {
        if (config.type === 'base') {
            continue;
        }

        if (config.type === 'service:core') {
            continue;
        }

        let groupKey: string = config.type;
        if (config.type.startsWith('use-case:')) {
            groupKey = 'use-case';
        }
        else {
            if (config.type.startsWith('repo:endpoint:')) {
                groupKey = 'repo:endpoint';
            }
            else {
                if (config.type.startsWith('repo:domain:')) {
                    groupKey = 'repo:domain';
                }
            }
        }

        if (groupedInjectables.has(groupKey) === false) {
            groupedInjectables.set(groupKey, []);
        }
        groupedInjectables.get(groupKey)!.push(name);
    }

    const groupOptions: { value: string; label: string; hint: string }[] = [];

    for (const [type, items] of groupedInjectables.entries()) {
        let label = '';
        switch (type) {
            case 'use-case':
                label = 'Use-Cases';
                break;
            case 'repo:endpoint':
                label = 'Endpoint Repos';
                break;
            case 'repo:domain':
                label = 'Domain Repos';
                break;
            case 'service:domain':
                label = 'Domain Services';
                break;
            case 'service:app':
                label = 'App Services';
                break;
            default:
                label = type;
        }

        groupOptions.push({
            value: type,
            label,
            hint: `${items.length} available`,
        });
    }

    const selectedType = await selectAction('Select injectable type:', groupOptions);
    if (selectedType === null) {
        return;
    }

    let selectedDomain: string = '*';
    const typesThatHaveDomains = ['use-case', 'repo:endpoint', 'repo:domain', 'service:domain'];

    if (typesThatHaveDomains.includes(selectedType) === true) {
        resetDomainsCache();
        const domains = getAllDomains().sort();

        if (domains.length === 0) {
            p.log.warn('No domains found.');
            return;
        }

        const domainOptions = [
            { value: '*', label: 'All domains' },
            ...domains.map(d => ({ value: d, label: d }))
        ];

        const domainChoice = await selectAction('Which domain?', domainOptions);
        if (domainChoice === null) {
            return;
        }
        selectedDomain = domainChoice;
    }

    let injectablesInGroup = groupedInjectables.get(selectedType)!;

    if (selectedDomain !== '*' && typesThatHaveDomains.includes(selectedType)) {
        injectablesInGroup = injectablesInGroup.filter(name => {
            const config = allInjectables[name];
            return 'domain' in config && config.domain === selectedDomain;
        });

        if (injectablesInGroup.length === 0) {
            p.log.warn(`No injectables found in domain: ${selectedDomain}`);
            return;
        }
    }

    injectablesInGroup = injectablesInGroup.sort();

    const injectableName = await selectAction('Select injectable to inspect:', injectablesInGroup.map(name => ({
        value: name,
        label: name,
    })));
    if (injectableName === null) {
        return;
    }

    const injectableConfig = allInjectables[injectableName];

    const lines: string[] = [];

    lines.push('');
    lines.push('DEPENDENCIES (what this needs):');
    lines.push('');

    let directDeps: string[] = [];
    if ('dependencies' in injectableConfig) {
        directDeps = injectableConfig.dependencies.filter(dep => {
            const depConfig = allInjectables[dep];
            return depConfig !== undefined && depConfig.type !== 'service:core';
        });
    }

    if (directDeps.length > 0) {
        lines.push(`Direct (${directDeps.length}):`);
        for (let i = 0; i < directDeps.length; i++) {
            const dep = directDeps[i];
            const depConfig = allInjectables[dep];
            const isLast = i === directDeps.length - 1;
            const treeChar = isLast ? '└─' : '├─';
            const isGlobal = depConfig !== undefined && 'isGlobal' in depConfig ? depConfig.isGlobal : undefined;
            const typeLabel = depConfig !== undefined ? formatInjectableType(depConfig.type, isGlobal) : '???';
            lines.push(`  ${treeChar} ${dep.padEnd(35)} ${typeLabel}`);
        }
        lines.push('');
    }
    else {
        lines.push('Direct: None');
        lines.push('');
    }

    const inheritedDeps = getDependenciesFromBaseClasses(injectableConfig).filter(dep => {
        const depConfig = allInjectables[dep];
        return depConfig !== undefined && depConfig.type !== 'service:core';
    });

    if (inheritedDeps.length > 0) {
        lines.push(`Inherited from Base Classes (${inheritedDeps.length}):`);
        for (let i = 0; i < inheritedDeps.length; i++) {
            const dep = inheritedDeps[i];
            const depConfig = allInjectables[dep];
            const isLast = i === inheritedDeps.length - 1;
            const treeChar = isLast ? '└─' : '├─';
            const isGlobal = depConfig !== undefined && 'isGlobal' in depConfig ? depConfig.isGlobal : undefined;
            const typeLabel = depConfig !== undefined ? formatInjectableType(depConfig.type, isGlobal) : '???';
            lines.push(`  ${treeChar} ${dep.padEnd(35)} ${typeLabel}`);
        }
        lines.push('');
    }

    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('');
    lines.push('DEPENDENTS (what depends on this):');
    lines.push('');

    const dependents = 'dependents' in injectableConfig ? injectableConfig.dependents : [];

    if (dependents.length > 0) {
        lines.push(`Direct (${dependents.length}):`);
        for (let i = 0; i < dependents.length; i++) {
            const dependent = dependents[i];
            const dependentConfig = allInjectables[dependent];
            const isLast = i === dependents.length - 1;
            const treeChar = isLast ? '└─' : '├─';
            const isGlobal = dependentConfig !== undefined && 'isGlobal' in dependentConfig ? dependentConfig.isGlobal : undefined;
            const typeLabel = dependentConfig !== undefined ? formatInjectableType(dependentConfig.type, isGlobal) : '???';
            lines.push(`  ${treeChar} ${dependent.padEnd(35)} ${typeLabel}`);
        }
    }
    else {
        if (injectableConfig.type === 'use-case:transactional' || injectableConfig.type === 'use-case:non-transactional') {
            lines.push('None (use-cases have no dependents)');
        }
        else {
            if (injectableConfig.type === 'repo:endpoint:transactional' || injectableConfig.type === 'repo:endpoint:non-transactional') {
                const useCaseName = injectableName.replace(/-repo$/, '-use-case');
                if (allInjectables[useCaseName] !== undefined) {
                    lines.push(`${useCaseName} (only its use-case can use it)`);
                }
                else {
                    lines.push('None (only its use-case can use it)');
                }
            }
            else {
                lines.push('None');
            }
        }
    }

    lines.push('');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const totalDeps = directDeps.length + inheritedDeps.length;
    if (totalDeps > 0) {
        lines.push(`Total: ${totalDeps} dependencies (${directDeps.length} direct, ${inheritedDeps.length} inherited)`);
    }

    p.note(
        lines.join('\n'),
        `📦 Inspecting: ${injectableName}`
    );
}
