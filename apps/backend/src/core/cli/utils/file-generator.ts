import { Eta } from 'eta';
import fs from 'fs';
import path from 'path';

export interface TemplateContext {
    domainNameKebabCase: string;
    domainNamePascalCase: string;
    domainNameCamelCase: string;
    endpointIdKebabCase?: string;
    endpointIdPascalCase?: string;
    endpointIdCamelCase?: string;
    httpMethod?: string;
    useTransaction?: boolean;
    generateRepo?: boolean;
    generateSummary?: boolean;
    generateDescription?: boolean;
    generateExtraTags?: boolean;
    generateMiddlewares?: boolean;
    generateResponseDescription?: boolean;
    generateUniqueKeyViolationErrorMap?: boolean;
    generateForeignKeyViolationErrorMap?: boolean;
    serviceNameKebabCase?: string;
    serviceNamePascalCase?: string;
    serviceNameCamelCase?: string;
    repoNameKebabCase?: string;
    repoNamePascalCase?: string;
    repoNameCamelCase?: string;
    repoOperation?: string;
    isGlobal?: boolean;
}

let etaInstance: Eta | undefined = undefined;

export function configureEta(templatesPath: string): void {
    etaInstance = new Eta({
        views: templatesPath,
        cache: false, 
        autoEscape: false, 
    });
}

export function renderTemplate(templateName: string, context: TemplateContext): string {
    try {
        if (etaInstance === undefined) {
            throw new Error('Eta not configured. Call configureEta() first.');
        }
        return etaInstance.render(templateName, context) as string;
    }
    catch (error) {
        throw new Error(`Failed to render template "${templateName}": ${error instanceof Error ? error.message : error}`);
    }
}

export class PathExistsError extends Error {
    public constructor(pathStr: string, type: 'file' | 'directory') {
        super(`${type === 'file' ? 'File' : 'Directory'} already exists: ${pathStr}`);
        this.name = 'PathExistsError';
    }
}

export function writeFile(outputPath: string, content: string): void {
    if (fs.existsSync(outputPath) === true) {
        throw new PathExistsError(outputPath, 'file');
    }

    const dir = path.dirname(outputPath);

    if (fs.existsSync(dir) === false) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, content, 'utf-8');
}

export function createDirectory(dirPath: string): void {
    if (fs.existsSync(dirPath) === true) {
        throw new PathExistsError(dirPath, 'directory');
    }
    fs.mkdirSync(dirPath, { recursive: true });
}

export function createDirectoryWithGitkeep(dirPath: string): void {
    createDirectory(dirPath);
    fs.writeFileSync(path.join(dirPath, '.gitkeep'), '', 'utf-8');
}

export function renderAndSave(templateName: string, context: TemplateContext, outputPath: string): void {
    const content = renderTemplate(templateName, context);
    writeFile(outputPath, content);
}
