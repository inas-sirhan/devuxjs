import path from 'path';
import fs from 'fs';
import * as p from '@clack/prompts';
import { kebabToPascalCase, kebabToCamelCase } from '@/core/cli/utils/case-converter';
import { validateDomainServiceName } from '@/core/cli/utils/validators';
import { configureEta, renderAndSave, type TemplateContext } from '@/core/cli/utils/file-generator';
import { saveRegistry } from '@/core/cli/injectables-registry/injectables-registry.manager';
import { registerInjectable } from '@/core/cli/injectables-registry/injectables-registry.updater';
import { checkInjectableCollision } from '@/core/cli/utils/collision-detection';
import { promptRequiredText } from '@/core/cli/utils/ui-utils';
import { selectDomain } from '@/core/cli/utils/selectors';
import { generateDomainServiceTestFile } from '@/core/cli/utils/tester-generator/test-file-generators';
import { generateDomainServiceTester } from '@/core/cli/utils/tester-generator/service-tester-generators';
import { BACKEND_SRC_PATH, TEMPLATES_PATH } from '@/core/cli/utils/cli-constants';


export async function createDomainService(): Promise<void> {
    const domain = await selectDomain('Select domain for service:');
    if (domain === null) {
        return;
    }

    const domainNameKebabCase = domain;
    const domainNamePascalCase = kebabToPascalCase(domainNameKebabCase);
    const domainNameCamelCase = kebabToCamelCase(domainNameKebabCase);

    const serviceName = await promptRequiredText(
        'Enter service name (kebab-case):',
        'Service name is required',
        (value) => {
            const result = validateDomainServiceName(value, domainNameKebabCase);
            if (result.valid === false) {
                return result.error;
            }
            const collision = checkInjectableCollision(value, 'service:domain');
            if (collision !== null) {
                return collision.message;
            }
            return undefined;
        }
    );

    if (serviceName === null) {
        return;
    }

    const serviceNameKebabCase = serviceName;
    const serviceNamePascalCase = kebabToPascalCase(serviceNameKebabCase);
    const serviceNameCamelCase = kebabToCamelCase(serviceNameKebabCase);

    const serviceCollision = checkInjectableCollision(serviceNameKebabCase, 'service:domain');
    if (serviceCollision !== null) {
        p.log.error(serviceCollision.message);
        return;
    }

    const context: TemplateContext = {
        domainNameKebabCase,
        domainNamePascalCase,
        domainNameCamelCase,
        serviceNameKebabCase,
        serviceNamePascalCase,
        serviceNameCamelCase,
    };

    const s = p.spinner();
    s.start('Generating domain service files...');

    configureEta(TEMPLATES_PATH);

    const servicePath = path.join(BACKEND_SRC_PATH, 'domains', domainNameKebabCase, 'services', serviceNameKebabCase);
    const internalsPath = path.join(BACKEND_SRC_PATH, '__internals__', 'domains', domainNameKebabCase, 'services', serviceNameKebabCase);

    const developerFiles = [
        { template: 'domain-service.zod.schemas.ts.eta', output: `${serviceNameKebabCase}.zod.schemas.ts` },
        { template: 'domain-service.ts.eta', output: `${serviceNameKebabCase}.ts` },
    ];

    const internalFiles = [
        { template: 'domain-service.interface.ts.eta', output: `${serviceNameKebabCase}.interface.ts` },
        { template: 'domain-service.inversify.tokens.ts.eta', output: `${serviceNameKebabCase}.inversify.tokens.ts` },
        { template: 'domain-service.inversify.bindings.ts.eta', output: `${serviceNameKebabCase}.inversify.bindings.ts` },
    ];

    for (const { template, output } of developerFiles) {
        renderAndSave(template, context, path.join(servicePath, output));
    }

    for (const { template, output } of internalFiles) {
        renderAndSave(template, context, path.join(internalsPath, output));
    }

    fs.mkdirSync(path.join(servicePath, 'tests'), { recursive: true });

    registerInjectable(serviceNameKebabCase, {
        type: 'service:domain',
        domain: domainNameKebabCase,
    });

    saveRegistry();

    generateDomainServiceTester({
        domainName: domainNameKebabCase,
        serviceName: serviceNameKebabCase,
    });
    generateDomainServiceTestFile(domainNameKebabCase, serviceNameKebabCase);

    s.stop(`Successfully generated domain service: ${domainNameKebabCase}/${serviceNameKebabCase}`);
}
