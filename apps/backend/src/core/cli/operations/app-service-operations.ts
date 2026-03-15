import path from 'path';
import fs from 'fs';
import * as p from '@clack/prompts';
import { kebabToPascalCase, kebabToCamelCase } from '@/core/cli/utils/case-converter';
import { validateAppServiceName } from '@/core/cli/utils/validators';
import { configureEta, renderAndSave, type TemplateContext } from '@/core/cli/utils/file-generator';
import { addGlobalAppServiceBinding, removeGlobalAppServiceBinding } from '@/core/cli/utils/ts-morph/app-service-operations.ts-morph';
import { getInjectable, saveRegistry } from '@/core/cli/injectables-registry/injectables-registry.manager';
import { registerAppService, removeInjectable } from '@/core/cli/injectables-registry/injectables-registry.updater';
import { checkInjectableCollision } from '@/core/cli/utils/collision-detection';
import { selectAction, confirmAction, promptRequiredText, selectRequired } from '@/core/cli/utils/ui-utils';
import { selectAppService } from '@/core/cli/utils/selectors';
import { generateAppServiceTestFile } from '@/core/cli/utils/tester-generator/test-file-generators';
import { generateAppServiceTester } from '@/core/cli/utils/tester-generator/service-tester-generators';
import { BACKEND_SRC_PATH, TEMPLATES_PATH } from '@/core/cli/utils/cli-constants';
import { addInjectableDependency, removeInjectableDependency } from '@/core/cli/operations/dependency-operations/injectable-dependencies';


export async function appServicesMenu(): Promise<void> {
    while (true) {
        const action = await selectAction('App Services - What do you want to do?', [
            { value: 'create', label: 'Create' },
            { value: 'rename', label: 'Rename', hint: 'currently disabled' },
            { value: 'delete', label: 'Delete' },
            { value: 'manage', label: 'Manage dependencies' },
        ]);

        if (action === null) {
            return;
        }

        switch (action) {
            case 'create':
                await createAppService();
                break;
            case 'rename':
                p.log.warning('Rename is currently disabled.');
                break;
            case 'delete':
                await deleteAppService();
                break;
            case 'manage':
                await manageAppServiceDependencies();
                break;
        }
    }
}


async function deleteAppService(): Promise<void> {
    const service = await selectAppService();
    if (service === null) {
        return;
    }

    const serviceConfig = getInjectable(service);
    if (serviceConfig === undefined) {
        p.log.error(`Service "${service}" not found in registry.`);
        return;
    }

    if ('dependents' in serviceConfig && serviceConfig.dependents.length > 0) {
        p.log.error(`Cannot delete "${service}": It is used by ${serviceConfig.dependents.length} injectable(s):`);
        for (const dependent of serviceConfig.dependents) {
            p.log.step(`- ${dependent}`);
        }
        p.log.info('Remove this service from each dependent first using "Manage dependencies", then try again.');
        return;
    }

    const confirmed = await confirmAction(`Are you sure you want to delete "${service}"?`);
    if (confirmed === false) {
        p.log.info('Deletion cancelled.');
        return;
    }

    const s = p.spinner();
    s.start('Deleting app service...');

    const servicePath = path.join(BACKEND_SRC_PATH, 'app-services', service);
    const internalsServicePath = path.join(BACKEND_SRC_PATH, '__internals__', 'app-services', service);

    fs.rmSync(servicePath, { recursive: true, force: true });
    fs.rmSync(internalsServicePath, { recursive: true, force: true });

    if (serviceConfig.isGlobal === true) {
        const serviceNamePascalCase = kebabToPascalCase(service);
        removeGlobalAppServiceBinding({
            serviceNameKebabCase: service,
            serviceNamePascalCase,
        });
    }

    removeInjectable(service);

    saveRegistry();

    s.stop(`Successfully deleted app service: ${service}`);
}

async function manageAppServiceDependencies(): Promise<void> {
    const service = await selectAppService();
    if (service === null) {
        return;
    }

    while (true) {
        const action = await selectAction(`Manage "${service}" dependencies - What do you want to do?`, [
            { value: 'add', label: 'Add dependency' },
            { value: 'remove', label: 'Remove dependency' },
        ]);

        if (action === null) {
            return;
        }

        switch (action) {
            case 'add':
                await addInjectableDependency(service);
                break;
            case 'remove':
                await removeInjectableDependency(service);
                break;
        }
    }
}

async function createAppService(): Promise<void> {
    const serviceName = await promptRequiredText(
        'Enter app service name (kebab-case):',
        'Service name is required',
        (value) => {
            const result = validateAppServiceName(value);
            if (result.valid === false) {
                return result.error;
            }
            const collision = checkInjectableCollision(value, 'service:app');
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

    const serviceCollision = checkInjectableCollision(serviceNameKebabCase, 'service:app');
    if (serviceCollision !== null) {
        p.log.error(serviceCollision.message);
        return;
    }

    const serviceTypeChoice = await selectRequired('Choose the service type:', [
        { value: 'request-scoped', label: 'Request scoped' },
        { value: 'global', label: 'Global' },
    ]);
    const isGlobal = serviceTypeChoice === 'global';

    const context: TemplateContext = {
        domainNameKebabCase: '',
        domainNamePascalCase: '',
        domainNameCamelCase: '',
        serviceNameKebabCase,
        serviceNamePascalCase,
        serviceNameCamelCase,
        isGlobal,
    };

    const s = p.spinner();
    s.start('Generating app service files...');

    configureEta(TEMPLATES_PATH);

    const servicePath = path.join(BACKEND_SRC_PATH, 'app-services', serviceNameKebabCase);
    const internalsPath = path.join(BACKEND_SRC_PATH, '__internals__', 'app-services', serviceNameKebabCase);

    const developerFiles = [
        { template: 'app-service.ts.eta', output: `${serviceNameKebabCase}.ts` },
        { template: 'app-service.interface.ts.eta', output: `${serviceNameKebabCase}.interface.ts` },
    ];

    const internalFiles = [
        { template: 'app-service.inversify.tokens.ts.eta', output: `${serviceNameKebabCase}.inversify.tokens.ts` },
        { template: 'app-service.inversify.bindings.ts.eta', output: `${serviceNameKebabCase}.inversify.bindings.ts` },
    ];

    for (const { template, output } of developerFiles) {
        renderAndSave(template, context, path.join(servicePath, output));
    }

    for (const { template, output } of internalFiles) {
        renderAndSave(template, context, path.join(internalsPath, output));
    }

    fs.mkdirSync(path.join(servicePath, 'tests'), { recursive: true });

    registerAppService(serviceNameKebabCase, { isGlobal });

    saveRegistry();

    if (isGlobal === true) {
        addGlobalAppServiceBinding({
            serviceNameKebabCase,
            serviceNamePascalCase,
        });
    }

    generateAppServiceTester({
        serviceName: serviceNameKebabCase,
        isGlobal,
    });
    generateAppServiceTestFile(serviceNameKebabCase);

    s.stop(`Successfully generated app service: ${serviceNameKebabCase}`);
}
