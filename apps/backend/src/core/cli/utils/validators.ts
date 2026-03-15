import fs from 'fs';
import path from 'path';
import { isKebabCase } from './case-converter';
import { checkEndpointCollision } from './collision-detection';
import { domainExists } from '@/core/cli/domains-registry/domains-registry.manager';
import { BACKEND_SRC_PATH, SHARED_PATH } from '@/core/cli/utils/cli-constants';

export function validateNewDomainName(domainName: string): { valid: boolean; error?: string } {
    if (isKebabCase(domainName) === false) {
        return { valid: false, error: 'Domain name must be in kebab-case (e.g., "customers", "customers-summary")' };
    }

    if (domainExists(domainName) === true) {
        return { valid: false, error: `Domain "${domainName}" already exists in registry` };
    }

    const domainPath = path.join(BACKEND_SRC_PATH, 'domains', domainName);
    if (fs.existsSync(domainPath) === true) {
        return { valid: false, error: `Domain folder already exists at: ${domainPath} but not in registry. This may indicate a broken state - please clean up manually.` };
    }

    const internalsPath = path.join(BACKEND_SRC_PATH, '__internals__', 'domains', domainName);
    if (fs.existsSync(internalsPath) === true) {
        return { valid: false, error: `Domain __internals__ folder already exists at: ${internalsPath} but not in registry. This may indicate a broken state - please clean up manually.` };
    }

    const sharedDomainPath = path.join(SHARED_PATH, 'src', 'shared-app', 'domains', domainName);
    if (fs.existsSync(sharedDomainPath) === true) {
        return { valid: false, error: `Domain shared package already exists at: ${sharedDomainPath} but not in registry. This may indicate a broken state - please clean up manually.` };
    }

    return { valid: true };
}

export function validateEndpointId(endpointId: string, domainPath: string): { valid: boolean; error?: string } {
    if (isKebabCase(endpointId) === false) {
        return { valid: false, error: 'Endpoint ID must be in kebab-case (e.g., "create-customer", "get-users")' };
    }

    const endpointPath = path.join(domainPath, 'endpoints', endpointId);
    if (fs.existsSync(endpointPath) === true) {
        return { valid: false, error: `Endpoint folder already exists at: ${endpointPath}` };
    }

    const collision = checkEndpointCollision(endpointId, null);
    if (collision !== null) {
        return { valid: false, error: collision.message };
    }

    return { valid: true };
}

export function validateDomainServiceName(serviceName: string, domainName: string): { valid: boolean; error?: string } {
    if (isKebabCase(serviceName) === false) {
        return { valid: false, error: 'Service name must be in kebab-case (e.g., "payment-processor", "email-sender")' };
    }

    const servicePath = path.join(BACKEND_SRC_PATH, 'domains', domainName, 'domain-services', serviceName);
    if (fs.existsSync(servicePath) === true) {
        return { valid: false, error: `Service folder already exists at: ${servicePath}` };
    }

    return { valid: true };
}

export function validateRepoName(repoName: string, domainName: string): { valid: boolean; error?: string } {
    if (isKebabCase(repoName) === false) {
        return { valid: false, error: 'Repo name must be in kebab-case (e.g., "user-repo", "analytics-repo")' };
    }

    const repoPath = path.join(BACKEND_SRC_PATH, 'domains', domainName, 'domain-repos', repoName);
    if (fs.existsSync(repoPath) === true) {
        return { valid: false, error: `Repo folder already exists at: ${repoPath}` };
    }

    return { valid: true };
}

export function validateHttpMethod(method: string): { valid: boolean; error?: string } {
    const allowedMethods = ['get', 'post', 'put', 'patch', 'delete'];

    if (allowedMethods.includes(method.toLowerCase()) === false) {
        return {
            valid: false,
            error: `HTTP method must be one of: ${allowedMethods.join(', ')}`
        };
    }

    return { valid: true };
}

export function validateAppServiceName(serviceName: string): { valid: boolean; error?: string } {
    if (isKebabCase(serviceName) === false) {
        return { valid: false, error: 'App service name must be in kebab-case (e.g., "email-sender", "payment-processor")' };
    }

    const servicePath = path.join(BACKEND_SRC_PATH, 'app-services', serviceName);
    if (fs.existsSync(servicePath) === true) {
        return { valid: false, error: `App service folder already exists at: ${servicePath}` };
    }

    return { valid: true };
}

export function validateExistingEndpointId(endpointId: string, domainPath: string): { valid: boolean; error?: string } {
    if (isKebabCase(endpointId) === false) {
        return { valid: false, error: 'Endpoint ID must be in kebab-case (e.g., "create-customer", "get-users")' };
    }

    const endpointPath = path.join(domainPath, 'endpoints', endpointId);
    if (fs.existsSync(endpointPath) === false) {
        return { valid: false, error: `Endpoint folder does not exist at: ${endpointPath}` };
    }

    return { valid: true };
}

export function validateEndpointRepoName(repoName: string): { valid: boolean; error?: string } {
    if (isKebabCase(repoName) === false) {
        return { valid: false, error: 'Repo name must be in kebab-case (e.g., create-user, get-users)' };
    }

    return { valid: true };
}
