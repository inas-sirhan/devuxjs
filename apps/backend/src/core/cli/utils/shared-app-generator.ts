import fs from 'fs';
import path from 'path';
import { Eta } from 'eta';
import { SHARED_PATH, TEMPLATES_PATH } from '@/core/cli/utils/cli-constants';

export interface GenerateDomainSharedAppFilesParams {
    domainNameKebabCase: string;
    domainNamePascalCase: string;
    domainNameCamelCase: string;
}

export interface GenerateEndpointZodSchemaParams {
    domainNameKebabCase: string;
    domainNamePascalCase: string;
    domainNameCamelCase: string;
    endpointIdKebabCase: string;
    endpointIdPascalCase: string;
    endpointIdCamelCase: string;
}

export function generateDomainSharedAppFiles(params: GenerateDomainSharedAppFilesParams): void {
    const {
        domainNameKebabCase,
        domainNamePascalCase,
        domainNameCamelCase,
    } = params;

    const eta = new Eta({
        views: path.join(TEMPLATES_PATH, 'shared-app'),
        cache: false,
        autoEscape: false,
    });

    const context = {
        domainNameKebabCase,
        domainNamePascalCase,
        domainNameCamelCase,
    };

    const domainPath = path.join(SHARED_PATH, 'src', 'shared-app', 'domains', domainNameKebabCase);

    const errorCodesPath = path.join(domainPath, `${domainNameKebabCase}.error-codes.ts`);
    const errorCodesContent = eta.render('error-codes.ts.eta', context);
    writeFile(errorCodesPath, errorCodesContent);

    const constantsPath = path.join(domainPath, `${domainNameKebabCase}.constants.ts`);
    const constantsContent = eta.render('constants.ts.eta', context);
    writeFile(constantsPath, constantsContent);

    const typesPath = path.join(domainPath, `${domainNameKebabCase}.types.ts`);
    const typesContent = eta.render('types.ts.eta', context);
    writeFile(typesPath, typesContent);

    const utilsPath = path.join(domainPath, `${domainNameKebabCase}.utils.ts`);
    const utilsContent = ``;
    writeFile(utilsPath, utilsContent);

    const fieldValidatorsPath = path.join(
        domainPath,
        'zod-schemas',
        `${domainNameKebabCase}.zod.field-validators.ts`
    );
    const fieldValidatorsContent = eta.render('field-validators.zod.ts.eta', context);
    writeFile(fieldValidatorsPath, fieldValidatorsContent);

    const baseSchemaPath = path.join(
        domainPath,
        'zod-schemas',
        `${domainNameKebabCase}.base.zod.schema.ts`
    );
    const baseSchemaContent = eta.render('base.zod.schema.ts.eta', context);
    writeFile(baseSchemaPath, baseSchemaContent);
}


export function generateEndpointZodSchema(params: GenerateEndpointZodSchemaParams): void {
    const {
        domainNameKebabCase,
        domainNameCamelCase,
        endpointIdKebabCase,
        endpointIdPascalCase,
        endpointIdCamelCase,
    } = params;

    const eta = new Eta({
        views: path.join(TEMPLATES_PATH, 'shared-app'),
        cache: false,
        autoEscape: false,
    });

    const context = {
        domainNameKebabCase,
        domainNameCamelCase,
        endpointIdKebabCase,
        endpointIdPascalCase,
        endpointIdCamelCase,
    };

    const zodSchemaPath = path.join(
        SHARED_PATH,
        'src',
        'shared-app',
        'domains',
        domainNameKebabCase,
        'zod-schemas',
        endpointIdKebabCase
    );

    const schemaFilePath = path.join(zodSchemaPath, `${endpointIdKebabCase}.zod.schema.ts`);
    const schemaContent = eta.render('endpoint.zod.schema.ts.eta', context);
    writeFile(schemaFilePath, schemaContent);
}

function writeFile(outputPath: string, content: string): void {
    const dir = path.dirname(outputPath);

    if (fs.existsSync(dir) === false) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, content, 'utf-8');
}
