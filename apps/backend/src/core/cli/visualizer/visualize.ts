import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { exec } from 'child_process';
import { generateEndpointsHtml } from './generate-visualize-html';
import type { InjectablesRegistry, RouteConfigInfo } from './visualize.types';


const __dirname = import.meta.dirname;

const REGISTRY_PATH = path.join(__dirname, '..', '..', '..', '__internals__', 'registries', 'injectables-registry.json');
const DOMAINS_PATH = path.join(__dirname, '..', '..', '..', 'domains');
const OUTPUT_PATH = path.join(__dirname, '..', '..', '..', '..', 'visualization.html');

function parseRouteConfig(endpointName: string, domain: string): RouteConfigInfo {
    const endpointId = endpointName.replace(/-use-case$/, '');
    const routeConfigPath = path.join(DOMAINS_PATH, domain, 'endpoints', endpointId, `${endpointId}.route.config.ts`);

    if (fs.existsSync(routeConfigPath) === false) {
        return { method: null, isFileUpload: null, error: `File not found: ${routeConfigPath}` };
    }

    const content = fs.readFileSync(routeConfigPath, 'utf-8');

    const methodMatches = content.match(/method\s*:\s*['"](\w+)['"]/g);
    let method: string | null = null;
    if (methodMatches === null) {
        return { method: null, isFileUpload: null, error: `No method found in ${routeConfigPath}` };
    }
    else {
        if (methodMatches.length > 1) {
            return { method: null, isFileUpload: null, error: `Multiple 'method' matches found in ${routeConfigPath}. We use regex - if you have comments containing 'method:', please remove them.` };
        }
        else {
            const match = methodMatches[0].match(/method\s*:\s*['"](\w+)['"]/);
            method = match !== null ? match[1] : null;
        }
    }

    const fileUploadMatches = content.match(/isFileUpload\s*:\s*(true|false)/g);
    let isFileUpload: boolean | null = false;
    if (fileUploadMatches !== null) {
        if (fileUploadMatches.length > 1) {
            return { method, isFileUpload: null, error: `Multiple 'isFileUpload' matches found in ${routeConfigPath}. We use regex - if you have comments containing 'isFileUpload:', please remove them.` };
        }
        const match = fileUploadMatches[0].match(/isFileUpload\s*:\s*(true|false)/);
        isFileUpload = match !== null ? match[1] === 'true' : false;
    }

    return { method, isFileUpload };
}

function getRegistry(): InjectablesRegistry {
    const data = fs.readFileSync(REGISTRY_PATH, 'utf-8');
    return JSON.parse(data);
}

function openFile(filePath: string): void {
    exec(`open-cli "${filePath}"`, (error) => {
        if (error !== null) {
            console.log(`⚠️ Could not auto-open file. Please open manually: ${filePath}`);
        }
    });
}

export function runVisualizer(): void {
    const registry = getRegistry();

    console.log('\n=== Endpoints Dependencies Graph Visualizer ===\n');

    const routeConfigs: Record<string, RouteConfigInfo> = {};
    const errors: string[] = [];

    for (const [name, config] of Object.entries(registry)) {
        if (config.type.startsWith('use-case:') && config.domain !== undefined) {
            const routeConfig = parseRouteConfig(name, config.domain);
            routeConfigs[name] = routeConfig;
            if (routeConfig.error !== undefined) {
                errors.push(routeConfig.error);
            }
        }
    }

    if (errors.length > 0) {
        console.log('⚠️  Route config parsing issues:');
        for (const error of errors) {
            console.log(`   - ${error}`);
        }
        console.log('');
    }

    const title = 'Endpoints Dependencies';

    const html = generateEndpointsHtml(registry, routeConfigs, title);
    fs.writeFileSync(OUTPUT_PATH, html);
    console.log(`✅ Visualization generated at ${OUTPUT_PATH}`);
    openFile(OUTPUT_PATH);
}

const isMainModule = import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule === true) {
    runVisualizer();
}
