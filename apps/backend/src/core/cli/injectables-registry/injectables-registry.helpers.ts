import { kebabToPascalCase, pascalToKebabCase } from '@/core/cli/utils/case-converter';
import type { InjectableConfig, InjectableType } from '@/core/cli/injectables-registry/injectables-registry.types';


export function extractNameFromToken(token: string): string {
    if (token.startsWith('I') === false) {
        throw new Error(`Invalid token format: "${token}". Must start with "I"`);
    }
    const pascalName = token.substring(1);
    return pascalToKebabCase(pascalName);
}


export function getInjectableToken(injectableName: string): string {
    const pascalName = kebabToPascalCase(injectableName);
    return `I${pascalName}`;
}


export function getInjectableTypeName(injectableName: string, config: InjectableConfig): string {
    const pascalName = kebabToPascalCase(injectableName);
    if (config.isCore && config.bindingType === 'value') {
        return pascalName;
    }
    return `I${pascalName}`;
}



export function getTokensImportPath(location: string, isCore: boolean): string {
    if (isCore === true) {
        return `@/${location}.inversify.tokens`;
    }
    return `@/__internals__/${location}.inversify.tokens`;
}



export function getTypeImportPath(location: string, config: InjectableConfig): string {
    if (config.isCore === true) {
        if (config.bindingType === 'value') {
            return `@/${location}.type`;
        }
        return `@/${location}.interface`;
    }
    if (config.type === 'service:app') {
        return `@/${location}.interface`;
    }
    return `@/__internals__/${location}.interface`;
}


const CORE_INJECTABLE_LOCATIONS: Record<string, string> = {
    'use-case-base': 'core/base-classes/use-case/use-case.base',
    'transactional-use-case': 'core/base-classes/use-case/transactional-use-case',
    'non-transactional-use-case': 'core/base-classes/use-case/non-transactional-use-case',
    'repo-base': 'core/base-classes/repo/repo.base',
    'transactional-repo': 'core/base-classes/repo/transactional-repo',
    'non-transactional-repo': 'core/base-classes/repo/non-transactional-repo',
    'domain-service-base': 'core/base-classes/domain-service/domain-service.base',
    'database-connection-pool': 'core/core-injectables/database/database-connection-pool/database-connection-pool',
    'core-hooks': 'core/core-injectables/core-hooks/core-hooks',
    'database-transaction-connection-provider': 'core/core-injectables/database/database-transaction-connection-provider/database-transaction-connection-provider',
    'database-transaction-manager': 'core/core-injectables/database/database-transaction-manager/database-transaction-manager',
    'request-context': 'core/core-injectables/request-context/request-context',
};


export function getLocation(name: string, config: InjectableConfig): string {
    if (config.isCore === true) {
        const location = CORE_INJECTABLE_LOCATIONS[name];
        if (location === undefined) {
            throw new Error(`Unknown core injectable: "${name}". Add it to CORE_INJECTABLE_LOCATIONS.`);
        }
        return location;
    }

    if (config.type === 'service:app') {
        return `app-services/${name}/${name}`;
    }

    const { type, domain } = config;

    switch (type) {
        case 'use-case:transactional':
        case 'use-case:non-transactional': {
            const endpointId = name.replace(/-use-case$/, '');
            return `domains/${domain}/endpoints/${endpointId}/${endpointId}.use-case`;
        }

        case 'repo:endpoint:transactional':
        case 'repo:endpoint:non-transactional': {
            const repoName = name.replace(/-repo$/, '');
            const useCase = config.dependents[0];
            const endpointId = useCase.replace(/-use-case$/, '');
            return `domains/${domain}/endpoints/${endpointId}/repos/${repoName}/${repoName}.repo`;
        }

        case 'repo:domain:transactional':
        case 'repo:domain:non-transactional': {
            const repoName = name.replace(/-repo$/, '');
            return `domains/${domain}/repos/${repoName}/${repoName}.repo`;
        }

        case 'repo:service:domain': {
            const serviceName = name.replace(/-repo$/, '');
            return `domains/${domain}/services/${serviceName}/${serviceName}.repo`;
        }

        case 'service:domain': {
            return `domains/${domain}/services/${name}/${name}`;
        }

        default:
            throw new Error(`Unknown injectable type: "${type}"`);
    }
}


export function getDefaultIsGlobal(type: InjectableType): boolean {
    if (type === 'service:core' || type === 'service:app') {
        return true;
    }
    return false;
}


export function getSetupFunctionName(injectableName: string): string {
    const pascalName = kebabToPascalCase(injectableName);
    return `setup${pascalName}Bindings`;
}


export function getGetterFunctionName(injectableName: string): string {
    const pascalName = kebabToPascalCase(injectableName);
    return `get${pascalName}ConstantValue`;
}


export function getSetterFunctionName(injectableName: string): string {
    const pascalName = kebabToPascalCase(injectableName);
    return `set${pascalName}`;
}
