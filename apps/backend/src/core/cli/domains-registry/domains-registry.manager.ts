import fs from 'fs';
import path from 'path';


const __dirname = import.meta.dirname;
const REGISTRY_PATH = path.join(__dirname, '..', '..', '..', '__internals__', 'registries', 'domains-registry.json');

let cachedDomains: string[] | null = null;

export function resetDomainsCache(): void {
    cachedDomains = null;
}

export function getDomains(): string[] {
    if (cachedDomains === null) {
        const data = fs.readFileSync(REGISTRY_PATH, 'utf-8');
        cachedDomains = JSON.parse(data) as string[];
    }
    return cachedDomains;
}

export function saveDomains(): void {
    if (cachedDomains === null) {
        throw new Error('Cannot save domains: no cached data. Call getDomains() first.');
    }
    fs.writeFileSync(REGISTRY_PATH, JSON.stringify(cachedDomains, null, 2), 'utf-8');
}

export function domainExists(domainName: string): boolean {
    const domains = getDomains();
    return domains.includes(domainName);
}

export function addDomain(domainName: string): void {
    const domains = getDomains();

    if (domains.includes(domainName) === true) {
        throw new Error(`Domain "${domainName}" already exists in registry`);
    }

    domains.push(domainName);
}

export function removeDomain(domainName: string): void {
    const domains = getDomains();

    const index = domains.indexOf(domainName);
    if (index === -1) {
        throw new Error(`Domain "${domainName}" not found in registry`);
    }

    domains.splice(index, 1);
}

export function getAllDomains(): string[] {
    return getDomains();
}
