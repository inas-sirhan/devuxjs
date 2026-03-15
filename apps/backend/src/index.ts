import '@/core/utils/load-env';
import '@/core/utils/extend-zod-with-openapi';
import path from 'path';
import fs from 'fs';

import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';

import { setupServer } from '@/server-setup';

import { AppContainer } from '@/core/containers/app-container';
import { setupAllDomainsEndpoints } from '@/__internals__/domains/domains.endpoints.setup';
import { loweredTokensRegistry } from '@/core/utils/di-tokens.core.utils';
import { coreConfig } from '@/infrastructure/core/core.config';

const appContainer = new AppContainer();

const startServer = await setupServer(appContainer.getExpressApp(), () => {
    setupAllDomainsEndpoints(appContainer);
    appContainer.registerRoutes();
}); 


if (coreConfig.syncApi === true) {
    console.log('⏳ Syncing API...');

    try {
        const generator = new OpenApiGeneratorV3(appContainer.getOpenApiRegistry()?.definitions ?? []);
        const openApiDoc = generator.generateDocument({
            info: {
                title: 'Devux Generated OpenApi Spec',
                version: '0.0.0',
            },
            openapi: '3.0.3',
        });

        const __dirname = import.meta.dirname;
        const apiDir = path.join(__dirname, '..', 'api');
        if (fs.existsSync(apiDir) === false) {
            fs.mkdirSync(apiDir);
        }
        fs.writeFileSync(
            path.join(apiDir, 'openapi.json'),
            JSON.stringify(openApiDoc, null, 2)
        );

        const apiFilePath = path.join(__dirname, '..', '..', '..', 'packages', 'shared', 'src', 'api', 'api.react-query.ts');
        const existingContent = fs.existsSync(apiFilePath) ? fs.readFileSync(apiFilePath, 'utf-8') : null;

        const { execSync } = await import('child_process');
        execSync('orval --config src/core/tools/orval/orval.config.ts', {
            stdio: ['inherit', 'inherit', 'inherit'],
            cwd: path.join(__dirname, '..')
        });

        const newContent = fs.readFileSync(apiFilePath, 'utf-8');
        if (existingContent === newContent) {
            console.log('✅ Synced successfully! (no changes)');
        }
        else {
            console.log('✅ Synced successfully!');
        }
    }
    catch (error) {
        console.error('❌ Sync failed:', error);
        process.exit(1);
    }
    process.exit(0);
} 

appContainer.clearSetupRelatedCaches();
loweredTokensRegistry.clear();

await startServer();

