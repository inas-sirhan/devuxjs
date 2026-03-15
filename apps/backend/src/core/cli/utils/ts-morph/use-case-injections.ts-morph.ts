import path from 'path';
import { BACKEND_SRC_PATH } from '@/core/cli/utils/cli-constants';
import { createOptimizedProject, ensureImport, removeImport, addInjectedProperty, removePropertyByDecorator } from '@/core/cli/utils/ts-morph/helpers.ts-morph';


export interface AddRepoToUseCaseParams {
    domainNameKebabCase: string;
    endpointIdKebabCase: string;
    endpointIdPascalCase: string;
    repoNameKebabCase: string;
    repoNamePascalCase: string;
    repoNameCamelCase: string;
}

export function addRepoToUseCase(params: AddRepoToUseCaseParams): void {
    const { domainNameKebabCase, endpointIdKebabCase, endpointIdPascalCase, repoNameKebabCase, repoNamePascalCase, repoNameCamelCase } = params;

    const project = createOptimizedProject();
    const useCasePath = path.join(BACKEND_SRC_PATH, 'domains', domainNameKebabCase, 'endpoints', endpointIdKebabCase, `${endpointIdKebabCase}.use-case.ts`);
    const sourceFile = project.addSourceFileAtPath(useCasePath);

    const repoTokensImportPath = `@/__internals__/domains/${domainNameKebabCase}/endpoints/${endpointIdKebabCase}/repos/${repoNameKebabCase}/${repoNameKebabCase}.repo.inversify.tokens`;
    const repoInterfaceImportPath = `@/__internals__/domains/${domainNameKebabCase}/endpoints/${endpointIdKebabCase}/repos/${repoNameKebabCase}/${repoNameKebabCase}.repo.interface`;

    ensureImport(sourceFile, repoTokensImportPath, `inject${repoNamePascalCase}Repo`);
    ensureImport(sourceFile, repoInterfaceImportPath, `I${repoNamePascalCase}Repo`, true);

    const useCaseClass = sourceFile.getClass(`${endpointIdPascalCase}UseCase`);
    if (useCaseClass !== undefined) {
        addInjectedProperty({
            targetClass: useCaseClass,
            sourceFile,
            decoratorName: `inject${repoNamePascalCase}Repo`,
            propertyName: `${repoNameCamelCase}Repo`,
            typeName: `I${repoNamePascalCase}Repo`,
            scope: 'private',
        });
    }

    sourceFile.saveSync();
}


export interface RemoveRepoFromUseCaseParams {
    domainNameKebabCase: string;
    endpointIdKebabCase: string;
    endpointIdPascalCase: string;
    repoNameKebabCase: string;
    repoNamePascalCase: string;
}

export function removeRepoFromUseCase(params: RemoveRepoFromUseCaseParams): void {
    const { domainNameKebabCase, endpointIdKebabCase, endpointIdPascalCase, repoNameKebabCase, repoNamePascalCase } = params;

    const project = createOptimizedProject();
    const useCasePath = path.join(BACKEND_SRC_PATH, 'domains', domainNameKebabCase, 'endpoints', endpointIdKebabCase, `${endpointIdKebabCase}.use-case.ts`);
    const sourceFile = project.addSourceFileAtPath(useCasePath);

    const repoTokensImportPath = `@/__internals__/domains/${domainNameKebabCase}/endpoints/${endpointIdKebabCase}/repos/${repoNameKebabCase}/${repoNameKebabCase}.repo.inversify.tokens`;
    const repoInterfaceImportPath = `@/__internals__/domains/${domainNameKebabCase}/endpoints/${endpointIdKebabCase}/repos/${repoNameKebabCase}/${repoNameKebabCase}.repo.interface`;

    removeImport(sourceFile, repoTokensImportPath);
    removeImport(sourceFile, repoInterfaceImportPath);

    const useCaseClass = sourceFile.getClass(`${endpointIdPascalCase}UseCase`);
    if (useCaseClass !== undefined) {
        removePropertyByDecorator(useCaseClass, `inject${repoNamePascalCase}Repo`);
    }

    sourceFile.saveSync();
}


export interface AddDomainRepoToUseCaseParams {
    domainNameKebabCase: string;
    endpointIdKebabCase: string;
    endpointIdPascalCase: string;
    repoNameKebabCase: string;
    repoNamePascalCase: string;
    repoNameCamelCase: string;
    repoDomainKebabCase: string;
}

export function addDomainRepoToUseCase(params: AddDomainRepoToUseCaseParams): void {
    const { domainNameKebabCase, endpointIdKebabCase, endpointIdPascalCase, repoNameKebabCase, repoNamePascalCase, repoNameCamelCase, repoDomainKebabCase } = params;

    const project = createOptimizedProject();
    const useCasePath = path.join(BACKEND_SRC_PATH, 'domains', domainNameKebabCase, 'endpoints', endpointIdKebabCase, `${endpointIdKebabCase}.use-case.ts`);
    const sourceFile = project.addSourceFileAtPath(useCasePath);

    const tokensImportPath = `@/__internals__/domains/${repoDomainKebabCase}/repos/${repoNameKebabCase}/${repoNameKebabCase}.repo.inversify.tokens`;
    const repoInterfaceImportPath = `@/__internals__/domains/${repoDomainKebabCase}/repos/${repoNameKebabCase}/${repoNameKebabCase}.repo.interface`;

    ensureImport(sourceFile, tokensImportPath, `inject${repoNamePascalCase}Repo`);
    ensureImport(sourceFile, repoInterfaceImportPath, `I${repoNamePascalCase}Repo`, true);

    const useCaseClass = sourceFile.getClass(`${endpointIdPascalCase}UseCase`);
    if (useCaseClass !== undefined) {
        addInjectedProperty({
            targetClass: useCaseClass,
            sourceFile,
            decoratorName: `inject${repoNamePascalCase}Repo`,
            propertyName: `${repoNameCamelCase}Repo`,
            typeName: `I${repoNamePascalCase}Repo`,
            scope: 'private',
        });
    }

    sourceFile.saveSync();
}


export interface RemoveDomainRepoFromUseCaseParams {
    domainNameKebabCase: string;
    endpointIdKebabCase: string;
    endpointIdPascalCase: string;
    repoNameKebabCase: string;
    repoNamePascalCase: string;
    repoDomainKebabCase: string;
}

export function removeDomainRepoFromUseCase(params: RemoveDomainRepoFromUseCaseParams): void {
    const { domainNameKebabCase, endpointIdKebabCase, endpointIdPascalCase, repoNameKebabCase, repoNamePascalCase, repoDomainKebabCase } = params;

    const project = createOptimizedProject();
    const useCasePath = path.join(BACKEND_SRC_PATH, 'domains', domainNameKebabCase, 'endpoints', endpointIdKebabCase, `${endpointIdKebabCase}.use-case.ts`);
    const sourceFile = project.addSourceFileAtPath(useCasePath);

    const tokensImportPath = `@/__internals__/domains/${repoDomainKebabCase}/repos/${repoNameKebabCase}/${repoNameKebabCase}.repo.inversify.tokens`;
    const repoInterfaceImportPath = `@/__internals__/domains/${repoDomainKebabCase}/repos/${repoNameKebabCase}/${repoNameKebabCase}.repo.interface`;

    removeImport(sourceFile, tokensImportPath);
    removeImport(sourceFile, repoInterfaceImportPath);

    const useCaseClass = sourceFile.getClass(`${endpointIdPascalCase}UseCase`);
    if (useCaseClass !== undefined) {
        removePropertyByDecorator(useCaseClass, `inject${repoNamePascalCase}Repo`);
    }

    sourceFile.saveSync();
}


export interface AddDomainServiceToUseCaseParams {
    domainNameKebabCase: string;
    endpointIdKebabCase: string;
    endpointIdPascalCase: string;
    serviceNameKebabCase: string;
    serviceNamePascalCase: string;
    serviceNameCamelCase: string;
    serviceDomainKebabCase: string;
}

export function addDomainServiceToUseCase(params: AddDomainServiceToUseCaseParams): void {
    const { domainNameKebabCase, endpointIdKebabCase, endpointIdPascalCase, serviceNameKebabCase, serviceNamePascalCase, serviceNameCamelCase, serviceDomainKebabCase } = params;

    const project = createOptimizedProject();
    const useCasePath = path.join(BACKEND_SRC_PATH, 'domains', domainNameKebabCase, 'endpoints', endpointIdKebabCase, `${endpointIdKebabCase}.use-case.ts`);
    const sourceFile = project.addSourceFileAtPath(useCasePath);

    const tokensImportPath = `@/__internals__/domains/${serviceDomainKebabCase}/services/${serviceNameKebabCase}/${serviceNameKebabCase}.inversify.tokens`;
    const serviceInterfaceImportPath = `@/__internals__/domains/${serviceDomainKebabCase}/services/${serviceNameKebabCase}/${serviceNameKebabCase}.interface`;

    ensureImport(sourceFile, tokensImportPath, `inject${serviceNamePascalCase}`);
    ensureImport(sourceFile, serviceInterfaceImportPath, `I${serviceNamePascalCase}`, true);

    const useCaseClass = sourceFile.getClass(`${endpointIdPascalCase}UseCase`);
    if (useCaseClass !== undefined) {
        addInjectedProperty({
            targetClass: useCaseClass,
            sourceFile,
            decoratorName: `inject${serviceNamePascalCase}`,
            propertyName: serviceNameCamelCase,
            typeName: `I${serviceNamePascalCase}`,
            scope: 'private',
        });
    }

    sourceFile.saveSync();
}


export interface RemoveDomainServiceFromUseCaseParams {
    domainNameKebabCase: string;
    endpointIdKebabCase: string;
    endpointIdPascalCase: string;
    serviceNameKebabCase: string;
    serviceNamePascalCase: string;
    serviceDomainKebabCase: string;
}

export function removeDomainServiceFromUseCase(params: RemoveDomainServiceFromUseCaseParams): void {
    const { domainNameKebabCase, endpointIdKebabCase, endpointIdPascalCase, serviceNameKebabCase, serviceNamePascalCase, serviceDomainKebabCase } = params;

    const project = createOptimizedProject();
    const useCasePath = path.join(BACKEND_SRC_PATH, 'domains', domainNameKebabCase, 'endpoints', endpointIdKebabCase, `${endpointIdKebabCase}.use-case.ts`);
    const sourceFile = project.addSourceFileAtPath(useCasePath);

    const tokensImportPath = `@/__internals__/domains/${serviceDomainKebabCase}/services/${serviceNameKebabCase}/${serviceNameKebabCase}.inversify.tokens`;
    const serviceInterfaceImportPath = `@/__internals__/domains/${serviceDomainKebabCase}/services/${serviceNameKebabCase}/${serviceNameKebabCase}.interface`;

    removeImport(sourceFile, tokensImportPath);
    removeImport(sourceFile, serviceInterfaceImportPath);

    const useCaseClass = sourceFile.getClass(`${endpointIdPascalCase}UseCase`);
    if (useCaseClass !== undefined) {
        removePropertyByDecorator(useCaseClass, `inject${serviceNamePascalCase}`);
    }

    sourceFile.saveSync();
}


export interface AddAppServiceToUseCaseParams {
    domainNameKebabCase: string;
    endpointIdKebabCase: string;
    endpointIdPascalCase: string;
    serviceNameKebabCase: string;
    serviceNamePascalCase: string;
    serviceNameCamelCase: string;
}

export function addAppServiceToUseCase(params: AddAppServiceToUseCaseParams): void {
    const { domainNameKebabCase, endpointIdKebabCase, endpointIdPascalCase, serviceNameKebabCase, serviceNamePascalCase, serviceNameCamelCase } = params;

    const project = createOptimizedProject();
    const useCasePath = path.join(BACKEND_SRC_PATH, 'domains', domainNameKebabCase, 'endpoints', endpointIdKebabCase, `${endpointIdKebabCase}.use-case.ts`);
    const sourceFile = project.addSourceFileAtPath(useCasePath);

    const tokensImportPath = `@/__internals__/app-services/${serviceNameKebabCase}/${serviceNameKebabCase}.inversify.tokens`;
    const serviceInterfaceImportPath = `@/app-services/${serviceNameKebabCase}/${serviceNameKebabCase}.interface`;

    ensureImport(sourceFile, tokensImportPath, `inject${serviceNamePascalCase}`);
    ensureImport(sourceFile, serviceInterfaceImportPath, `I${serviceNamePascalCase}`, true);

    const useCaseClass = sourceFile.getClass(`${endpointIdPascalCase}UseCase`);
    if (useCaseClass !== undefined) {
        addInjectedProperty({
            targetClass: useCaseClass,
            sourceFile,
            decoratorName: `inject${serviceNamePascalCase}`,
            propertyName: serviceNameCamelCase,
            typeName: `I${serviceNamePascalCase}`,
            scope: 'private',
        });
    }

    sourceFile.saveSync();
}


export interface RemoveAppServiceFromUseCaseParams {
    domainNameKebabCase: string;
    endpointIdKebabCase: string;
    endpointIdPascalCase: string;
    serviceNameKebabCase: string;
    serviceNamePascalCase: string;
}

export function removeAppServiceFromUseCase(params: RemoveAppServiceFromUseCaseParams): void {
    const { domainNameKebabCase, endpointIdKebabCase, endpointIdPascalCase, serviceNameKebabCase, serviceNamePascalCase } = params;

    const project = createOptimizedProject();
    const useCasePath = path.join(BACKEND_SRC_PATH, 'domains', domainNameKebabCase, 'endpoints', endpointIdKebabCase, `${endpointIdKebabCase}.use-case.ts`);
    const sourceFile = project.addSourceFileAtPath(useCasePath);

    const tokensImportPath = `@/__internals__/app-services/${serviceNameKebabCase}/${serviceNameKebabCase}.inversify.tokens`;
    const serviceInterfaceImportPath = `@/app-services/${serviceNameKebabCase}/${serviceNameKebabCase}.interface`;

    removeImport(sourceFile, tokensImportPath);
    removeImport(sourceFile, serviceInterfaceImportPath);

    const useCaseClass = sourceFile.getClass(`${endpointIdPascalCase}UseCase`);
    if (useCaseClass !== undefined) {
        removePropertyByDecorator(useCaseClass, `inject${serviceNamePascalCase}`);
    }

    sourceFile.saveSync();
}
