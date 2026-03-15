import path from 'path';
import fs from 'fs';
import * as p from '@clack/prompts';
import { kebabToPascalCase, kebabToCamelCase } from '@/core/cli/utils/case-converter';
import { validateEndpointId } from '@/core/cli/utils/validators';
import { configureEta, renderAndSave, type TemplateContext } from '@/core/cli/utils/file-generator';
import { generateEndpointZodSchema } from '@/core/cli/utils/shared-app-generator';
import { addSetupEndpointCall } from '@/core/cli/utils/ts-morph/endpoint-operations.ts-morph';
import { coreConfig } from '@/infrastructure/core/core.config';
import { saveRegistry } from '@/core/cli/injectables-registry/injectables-registry.manager';
import { addEndpointId, saveEndpointIds } from '@/core/cli/endpoints-ids-registry/endpoints-ids-registry.manager';
import { registerEndpointInjectable } from '@/core/cli/injectables-registry/injectables-registry.updater';
import { checkEndpointCollision } from '@/core/cli/utils/collision-detection';
import { handleCancel, selectRequired, promptRequiredText } from '@/core/cli/utils/ui-utils';
import { selectDomain } from '@/core/cli/utils/selectors';
import { httpMethodToRepoOperation } from '@/core/cli/utils/type-utils';
import { generateEndpointTestFiles, generateRepoTestFile } from '@/core/cli/utils/tester-generator/test-file-generators';
import { generateUseCaseTester, generateE2ETester } from '@/core/cli/utils/tester-generator/use-case-tester-generator';
import { generateRepoTester } from '@/core/cli/utils/tester-generator/repo-tester-generator';
import { BACKEND_SRC_PATH, TEMPLATES_PATH } from '@/core/cli/utils/cli-constants';

export async function createEndpoint(): Promise<void> {
    const domain = await selectDomain('Select domain for endpoint:');
    if (domain === null) {
        return;
    }

    const domainNameKebabCase = domain;
    const domainNamePascalCase = kebabToPascalCase(domainNameKebabCase);
    const domainNameCamelCase = kebabToCamelCase(domainNameKebabCase);
    const domainPath = path.join(BACKEND_SRC_PATH, 'domains', domainNameKebabCase);

    const endpointId = await promptRequiredText(
        'Enter endpoint ID (kebab-case):',
        'Endpoint ID is required',
        (value) => {
            const result = validateEndpointId(value, domainPath);
            if (result.valid === false) {
                return result.error;
            }
            return undefined;
        }
    );

    if (endpointId === null) {
        return;
    }

    const endpointIdKebabCase = endpointId;
    const endpointIdPascalCase = kebabToPascalCase(endpointIdKebabCase);
    const endpointIdCamelCase = kebabToCamelCase(endpointIdKebabCase);

    const httpMethod = await selectRequired('Select HTTP method:', [
        { value: 'get' as const, label: 'GET' },
        { value: 'post' as const, label: 'POST' },
        { value: 'put' as const, label: 'PUT' },
        { value: 'patch' as const, label: 'PATCH' },
        { value: 'delete' as const, label: 'DELETE' },
    ]);

    const useTransactionChoice = await p.confirm({
        message: 'Is it transactional?',
        initialValue: true,
    });

    if (p.isCancel(useTransactionChoice) === true) {
        handleCancel();
    }
    const useTransaction = useTransactionChoice as boolean;

    const generateRepoChoice = await p.confirm({
        message: 'Generate default repo?',
        initialValue: true,
    });
    if (p.isCancel(generateRepoChoice) === true) {
        handleCancel();
    }
    const generateRepo = generateRepoChoice as boolean;

    const defaultRepoName = generateRepo ? `${endpointIdKebabCase}-repo` : null;
    const endpointCollision = checkEndpointCollision(endpointIdKebabCase, defaultRepoName);
    if (endpointCollision !== null) {
        p.log.error(endpointCollision.message);
        return;
    }

    const repoNameKebabCase = endpointIdKebabCase;
    const repoNamePascalCase = endpointIdPascalCase;
    const repoNameCamelCase = endpointIdCamelCase;

    const repoOperation = httpMethodToRepoOperation(httpMethod);

    const context: TemplateContext = {
        domainNameKebabCase,
        domainNamePascalCase,
        domainNameCamelCase,
        endpointIdKebabCase,
        endpointIdPascalCase,
        endpointIdCamelCase,
        repoNameKebabCase,
        repoNamePascalCase,
        repoNameCamelCase,
        httpMethod,
        repoOperation,
        useTransaction,
        generateRepo,
        generateSummary: coreConfig.generator.routeConfig.generateSummary,
        generateDescription: coreConfig.generator.routeConfig.generateDescription,
        generateExtraTags: coreConfig.generator.routeConfig.generateExtraTags,
        generateMiddlewares: coreConfig.generator.routeConfig.generateMiddlewares,
        generateResponseDescription: coreConfig.generator.responses.generateDescription,
        generateUniqueKeyViolationErrorMap: coreConfig.generator.repo.generateUniqueKeyViolationErrorMap,
        generateForeignKeyViolationErrorMap: coreConfig.generator.repo.generateForeignKeyViolationErrorMap,
    };

    const s = p.spinner();
    s.start('Generating endpoint files...');

    configureEta(TEMPLATES_PATH);

    const outputPath = path.join(domainPath, 'endpoints', endpointIdKebabCase);
    const internalsPath = path.join(BACKEND_SRC_PATH, '__internals__', 'domains', domainNameKebabCase, 'endpoints', endpointIdKebabCase);

    const developerFiles = [
        { template: 'use-case.ts.eta', output: `${endpointIdKebabCase}.use-case.ts` },
        { template: 'responses.ts.eta', output: `${endpointIdKebabCase}.responses.ts` },
        { template: 'route.config.ts.eta', output: `${endpointIdKebabCase}.route.config.ts` },
    ];

    const repoDevFiles = generateRepo ? [
        { template: 'endpoint-repo.zod.schemas.ts.eta', output: `${endpointIdKebabCase}.repo.zod.schemas.ts` },
        { template: 'endpoint-repo.ts.eta', output: `${endpointIdKebabCase}.repo.ts` }
    ] : [];

    const internalFiles = [
        { template: 'controller.interface.ts.eta', output: `${endpointIdKebabCase}.controller.interface.ts` },
        { template: 'controller.ts.eta', output: `${endpointIdKebabCase}.controller.ts` },
        { template: 'use-case.interface.ts.eta', output: `${endpointIdKebabCase}.use-case.interface.ts` },
        { template: 'presenter.interface.ts.eta', output: `${endpointIdKebabCase}.presenter.interface.ts` },
        { template: 'presenter.ts.eta', output: `${endpointIdKebabCase}.presenter.ts` },
        { template: 'validator.interface.ts.eta', output: `${endpointIdKebabCase}.validator.interface.ts` },
        { template: 'validator.ts.eta', output: `${endpointIdKebabCase}.validator.ts` },
        { template: 'inversify.tokens.ts.eta', output: `${endpointIdKebabCase}.inversify.tokens.ts` },
        { template: 'inversify.bindings.ts.eta', output: `${endpointIdKebabCase}.inversify.bindings.ts` },
        { template: 'endpoint.setup.ts.eta', output: `${endpointIdKebabCase}.endpoint.setup.ts` },
    ];

    const repoInternalFiles = generateRepo ? [
        { template: 'endpoint-repo.interface.ts.eta', output: `${endpointIdKebabCase}.repo.interface.ts` },
        { template: 'endpoint-repo.inversify.tokens.ts.eta', output: `${endpointIdKebabCase}.repo.inversify.tokens.ts` },
        { template: 'endpoint-repo.inversify.bindings.ts.eta', output: `${endpointIdKebabCase}.repo.inversify.bindings.ts` },
    ] : [];

    for (const { template, output } of developerFiles) {
        renderAndSave(template, context, path.join(outputPath, output));
    }

    for (const { template, output } of internalFiles) {
        renderAndSave(template, context, path.join(internalsPath, output));
    }

    const repoOutputPath = path.join(outputPath, 'repos', endpointIdKebabCase);
    const repoInternalsPath = path.join(internalsPath, 'repos', endpointIdKebabCase);

    for (const { template, output } of repoDevFiles) {
        renderAndSave(template, context, path.join(repoOutputPath, output));
    }

    for (const { template, output } of repoInternalFiles) {
        renderAndSave(template, context, path.join(repoInternalsPath, output));
    }

    fs.mkdirSync(path.join(outputPath, 'tests'), { recursive: true });

    if (generateRepo === true) {
        fs.mkdirSync(path.join(repoOutputPath, 'tests'), { recursive: true });
    }

    addSetupEndpointCall({
        domainNameKebabCase,
        endpointIdKebabCase,
        endpointIdPascalCase,
    });

    generateEndpointZodSchema({
        domainNameKebabCase,
        domainNamePascalCase,
        domainNameCamelCase,
        endpointIdKebabCase,
        endpointIdPascalCase,
        endpointIdCamelCase,
    });

    if (defaultRepoName !== null) {
        registerEndpointInjectable(defaultRepoName, {
            type: useTransaction ? 'repo:endpoint:transactional' : 'repo:endpoint:non-transactional',
            domain: domainNameKebabCase,
            dependencies: [],
        });
    }

    const useCaseName = `${endpointIdKebabCase}-use-case`;
    registerEndpointInjectable(useCaseName, {
        type: useTransaction ? 'use-case:transactional' : 'use-case:non-transactional',
        domain: domainNameKebabCase,
        dependencies: defaultRepoName !== null ? [defaultRepoName] : [],
    });

    addEndpointId(endpointIdKebabCase);

    saveRegistry();
    saveEndpointIds();

    generateUseCaseTester(domainNameKebabCase, endpointIdKebabCase);
    generateE2ETester(domainNameKebabCase, endpointIdKebabCase);

    generateEndpointTestFiles(domainNameKebabCase, endpointIdKebabCase);

    if (generateRepo === true) {
        generateRepoTester({
            repoType: 'endpoint',
            domainName: domainNameKebabCase,
            repoName: endpointIdKebabCase,
            isTransactional: useTransaction,
            endpointId: endpointIdKebabCase,
        });
        generateRepoTestFile({
            repoType: 'endpoint',
            domainName: domainNameKebabCase,
            repoName: endpointIdKebabCase,
            endpointId: endpointIdKebabCase,
        });
    }

    s.stop(`Successfully generated endpoint: ${domainNameKebabCase}/${endpointIdKebabCase}`);
}
