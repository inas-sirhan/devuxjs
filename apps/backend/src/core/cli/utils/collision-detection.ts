import { injectableExists, getInjectable } from '@/core/cli/injectables-registry/injectables-registry.manager';
import { getAllEndpointIds } from '@/core/cli/endpoints-ids-registry/endpoints-ids-registry.manager';


const USE_CASE_SUFFIX = '-use-case';
const REPO_SUFFIX = '-repo';


export function checkEndpointCollision(
    endpointIdKebab: string,
    defaultRepoName: string | null
): {
    hasCollision: true;
    message: string;
} | null {

    const allEndpointIds = getAllEndpointIds();
    if (allEndpointIds.includes(endpointIdKebab) === true) {
        return {
            hasCollision: true,
            message: `Cannot create endpoint "${endpointIdKebab}": Endpoint ID already exists.\n` +
                `Endpoint IDs must be globally unique across all domains.`
        };
    }
    
    const useCaseKey = `${endpointIdKebab}${USE_CASE_SUFFIX}`;
    if (injectableExists(useCaseKey) === true) {
        const existing = getInjectable(useCaseKey)!;
        return {
            hasCollision: true,
            message: `Cannot create endpoint "${endpointIdKebab}": Use-case "${useCaseKey}" already exists as ${existing.type}.\n` +
                `Choose a different endpoint ID.`
        };
    }

    if (defaultRepoName !== null) {
        if (injectableExists(defaultRepoName) === true) {
            const existing = getInjectable(defaultRepoName)!;
            return {
                hasCollision: true,
                message: `Cannot create endpoint "${endpointIdKebab}": "${defaultRepoName}" already exists as ${existing.type}.\nChoose a different endpoint ID.`
            };
        }
    }

    if (injectableExists(endpointIdKebab) === true) {
        const existing = getInjectable(endpointIdKebab)!;
        return {
            hasCollision: true,
            message: `Cannot create endpoint "${endpointIdKebab}": Base name collides with existing ${existing.type} "${endpointIdKebab}".\n` +
                `Choose a different endpoint ID.`
        };
    }

    const endpointGeneratedSuffixes = ['-controller', '-validator', '-presenter'];
    for (const suffix of endpointGeneratedSuffixes) {
        const potentialCollision = `${endpointIdKebab}${suffix}`;
        if (injectableExists(potentialCollision) === true) {
            const existing = getInjectable(potentialCollision)!;
            return {
                hasCollision: true,
                message: `Cannot create endpoint "${endpointIdKebab}": Generated class would collide with existing ${existing.type} "${potentialCollision}".\n` +
                    `Rename or delete "${potentialCollision}" first, or choose a different endpoint ID.`
            };
        }
    }

    return null;
}


export function checkInjectableCollision(
    injectableNameKebab: string,
    injectableType: 'service:domain' | 'service:app' | 'repo:domain' | 'repo:domain:transactional' | 'repo:domain:non-transactional'
): {
    hasCollision: true;
    message: string;
} | null {
    const allEndpointIds = getAllEndpointIds();

    const registryKey = injectableType.startsWith('repo:')
        ? `${injectableNameKebab}${REPO_SUFFIX}`
        : injectableNameKebab;

    if (injectableExists(registryKey) === true) {
        const existing = getInjectable(registryKey)!;
        return {
            hasCollision: true,
            message: `Cannot create ${injectableType} "${injectableNameKebab}": "${registryKey}" already exists as ${existing.type}.`
        };
    }

    if (allEndpointIds.includes(injectableNameKebab) === true) {
        return {
            hasCollision: true,
            message: `Cannot create ${injectableType} "${injectableNameKebab}": Base name collides with existing endpoint "${injectableNameKebab}".\n` +
                `Consider naming it "${injectableNameKebab}-service" or similar.`
        };
    }

    if (injectableType.startsWith('service:') === true) {
        const endpointGeneratedSuffixes = ['-controller', '-validator', '-presenter'];
        for (const suffix of endpointGeneratedSuffixes) {
            if (injectableNameKebab.endsWith(suffix) === true) {
                const potentialEndpointId = injectableNameKebab.slice(0, -suffix.length);
                if (allEndpointIds.includes(potentialEndpointId) === true) {
                    return {
                        hasCollision: true,
                        message: `Cannot create ${injectableType} "${injectableNameKebab}": Name collides with generated class from endpoint "${potentialEndpointId}".\n` +
                            `Choose a different name that doesn't end with ${suffix}.`
                    };
                }
            }
        }
    }

    if (injectableType === 'repo:domain' || injectableType === 'repo:domain:transactional' || injectableType === 'repo:domain:non-transactional') {
        for (const endpointId of allEndpointIds) {
            if (injectableNameKebab === endpointId) {
                return {
                    hasCollision: true,
                    message: `Cannot create domain repo "${injectableNameKebab}": Name collides with potential endpoint repo for "${endpointId}".\n` +
                        `If you need a repo for this endpoint, use "Generate Endpoint Repo" instead.\n` +
                        `For domain repos, choose a distinct name.`
                };
            }
        }
    }

    return null;
}

export function checkEndpointRepoCollision(
    repoNameKebab: string
): {
    hasCollision: true;
    message: string;
} | null {
    const repoKey = `${repoNameKebab}${REPO_SUFFIX}`;

    if (injectableExists(repoKey) === true) {
        const existing = getInjectable(repoKey)!;
        return {
            hasCollision: true,
            message: `Cannot create endpoint repo "${repoNameKebab}": "${repoKey}" already exists as ${existing.type}.\n` +
                `Choose a different repo name.`
        };
    }

    return null;
}
