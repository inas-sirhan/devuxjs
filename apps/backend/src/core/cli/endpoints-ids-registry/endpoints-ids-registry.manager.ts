import fs from 'fs';
import path from 'path';


const __dirname = import.meta.dirname;
const REGISTRY_PATH = path.join(__dirname, '..', '..', '..', '__internals__', 'registries', 'endpoints-ids-registry.json');

let cachedEndpointIds: string[] | null = null;

export function resetEndpointIdsCache(): void {
    cachedEndpointIds = null;
}

export function getEndpointIds(): string[] {
    if (cachedEndpointIds === null) {
        const data = fs.readFileSync(REGISTRY_PATH, 'utf-8');
        cachedEndpointIds = JSON.parse(data) as string[];
    }
    return cachedEndpointIds;
}

export function saveEndpointIds(): void {
    if (cachedEndpointIds === null) {
        throw new Error('Cannot save endpoint IDs: no cached data. Call getEndpointIds() first.');
    }
    const sortedIds = [...cachedEndpointIds].sort();
    fs.writeFileSync(REGISTRY_PATH, JSON.stringify(sortedIds, null, 2), 'utf-8');
    cachedEndpointIds = sortedIds;
}


export function addEndpointId(id: string): void {
    if (id.length === 0 || typeof id !== 'string') {
        throw new Error('Endpoint ID must be a non-empty string');
    }

    if (/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(id) === false) {
        throw new Error(
            `Invalid endpoint ID format: "${id}". Must be kebab-case (e.g., "create-user")`
        );
    }

    const endpointIds = getEndpointIds();

    if (endpointIds.includes(id) === true) {
        throw new Error(
            `Endpoint ID "${id}" already exists in the registry`
        );
    }

    endpointIds.push(id);
}


export function removeEndpointId(id: string): void {
    const endpointIds = getEndpointIds();

    const index = endpointIds.indexOf(id);
    if (index === -1) {
        throw new Error(
            `Cannot remove endpoint ID "${id}": not found in registry`
        );
    }

    endpointIds.splice(index, 1);
}


export function hasEndpointId(id: string): boolean {
    const endpointIds = getEndpointIds();
    return endpointIds.includes(id);
}

export function getAllEndpointIds(): readonly string[] {
    return getEndpointIds();
}

export function extractIdFromUseCaseName(useCaseName: string): string {
    if (useCaseName.endsWith('-use-case') === false) {
        throw new Error(
            `Invalid use-case name: "${useCaseName}". Must end with "-use-case"`
        );
    }

    return useCaseName.slice(0, -'-use-case'.length);
}
