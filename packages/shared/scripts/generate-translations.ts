import fs from 'fs';
import path from 'path';
import { translationLanguages } from '../src/translation/translation.config';
import { pathToFileURL } from 'url';
import { validateErrorCodes } from '@packages/shared-core/utils/define-error-codes';


const __dirname = import.meta.dirname;

const SHARED_CORE_VALIDATION_ERROR_CODES = path.join(__dirname, '../src/shared-core/zod/validation.error-codes.ts');
const SHARED_APP_ERROR_CODES = path.join(__dirname, '../src/shared-app/shared.app.error-codes.ts');
const API_ERROR_CODES = path.join(__dirname, '../src/shared-app/api-errors/api-errors.error-codes.ts');
const DOMAINS_PATH = path.join(__dirname, '../src/shared-app/domains');
const OUTPUT_PATH = path.join(__dirname, '../src/translation/translations');

interface ErrorCodeCollection {
    [key: string]: string;
}

interface ErrorCodesByDomain {
    domain: string;
    fileName: string;
    codes: string[];
}

async function extractErrorCodesFromFile(filePath: string): Promise<string[]> {
    const fileName = path.basename(filePath);

    try {
        const fileUrl = pathToFileURL(filePath).href;
        const module = await import(fileUrl);

        const exports = Object.entries(module).filter(([key, value]) => {
            return key !== 'default' && typeof value === 'object' && value !== null;
        });

        if (exports.length === 0) {
            throw new Error(`No object exports found in ${fileName}`);
        }

        if (exports.length > 1) {
            const exportNames = exports.map(([key]) => key).join(', ');
            throw new Error(`Expected exactly 1 object export, but found ${exports.length}: ${exportNames}`);
        }

        const [exportName, exportedValue] = exports[0];

        if (typeof exportedValue !== 'object' || exportedValue === null) {
            throw new Error(`Export "${exportName}" is not an object`);
        }

        const errorCodesObject = exportedValue as Record<string, string>;
        const errorCodes = Object.values(errorCodesObject);

        validateErrorCodes(errorCodesObject);

        return errorCodes;

    }
    catch (error) {
        console.error(`❌ ${fileName}: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
    }
}

async function getAllErrorCodes(): Promise<ErrorCodesByDomain[]> {
    const errorCodesByDomain: ErrorCodesByDomain[] = [];

    if (fs.existsSync(SHARED_CORE_VALIDATION_ERROR_CODES)) {
        const codes = await extractErrorCodesFromFile(SHARED_CORE_VALIDATION_ERROR_CODES);
        errorCodesByDomain.push({
            domain: 'Validation',
            fileName: 'validation.error-codes.ts',
            codes
        });
    }

    if (fs.existsSync(SHARED_APP_ERROR_CODES)) {
        const codes = await extractErrorCodesFromFile(SHARED_APP_ERROR_CODES);
        if (codes.length > 0) {
            errorCodesByDomain.push({
                domain: 'Shared',
                fileName: 'shared.error-codes.ts',
                codes
            });
        }
    }

    if (fs.existsSync(API_ERROR_CODES)) {
        const codes = await extractErrorCodesFromFile(API_ERROR_CODES);
        if (codes.length > 0) {
            errorCodesByDomain.push({
                domain: 'ApiErrors',
                fileName: 'api-errors.error-codes.ts',
                codes
            });
        }
    }

    if (fs.existsSync(DOMAINS_PATH) === true) {
        const domains = fs.readdirSync(DOMAINS_PATH).filter(item => {
            const domainPath = path.join(DOMAINS_PATH, item);
            return fs.statSync(domainPath).isDirectory();
        });

        for (const domainName of domains) {
            const errorCodesFile = path.join(DOMAINS_PATH, domainName, `${domainName}.error-codes.ts`);

            if (fs.existsSync(errorCodesFile) === true) {
                const codes = await extractErrorCodesFromFile(errorCodesFile);

                if (codes.length > 0) {
                    const domain = domainName.charAt(0).toUpperCase() + domainName.slice(1);

                    errorCodesByDomain.push({
                        domain,
                        fileName: `${domainName}.error-codes.ts`,
                        codes
                    });
                }
            }
        }
    }

    return errorCodesByDomain.sort((a, b) => a.domain.localeCompare(b.domain));
}

function generateTranslationFile(language: string, errorCodesByDomain: ErrorCodesByDomain[], existingTranslations?: ErrorCodeCollection): string {
    let content = `export const ${language}Translations = {\n`;

    for (const { domain, codes } of errorCodesByDomain) {
        content += `\n    // ============================================\n`;
        content += `    // ${domain}\n`;
        content += `    // ============================================\n`;

        for (const code of codes) {
            const translation = existingTranslations?.[code] || '';
            const comment = translation ? '' : '';
            content += `    '${code}': '${translation}',${comment}\n`;
        }
    }

    content += `} as const;\n`;

    return content;
}

async function readExistingTranslations(filePath: string): Promise<ErrorCodeCollection | undefined> {
    if (fs.existsSync(filePath) === false) {
        return undefined;
    }

    try {
        const fileUrl = pathToFileURL(filePath).href;
        const module = await import(fileUrl);

        const exports = Object.entries(module).filter(([key, value]) => {
            return key !== 'default' && typeof value === 'object' && value !== null;
        });

        if (exports.length === 0) {
            return undefined;
        }

        const [, exportedValue] = exports[0];
        return exportedValue as ErrorCodeCollection;
    }
    catch {
        return undefined;
    }
}

function checkForDuplicates(errorCodesByDomain: ErrorCodesByDomain[]): void {
    const keyOccurrences = new Map<string, Array<{ domain: string; fileName: string }>>();

    for (const { domain, fileName, codes } of errorCodesByDomain) {
        for (const code of codes) {
            if (keyOccurrences.has(code) === false) {
                keyOccurrences.set(code, []);
            }
            keyOccurrences.get(code)!.push({ domain, fileName });
        }
    }

    const duplicates = Array.from(keyOccurrences.entries())
        .filter(([_, occurrences]) => occurrences.length > 1);

    if (duplicates.length > 0) {
        for (const [key, occurrences] of duplicates) {
            const locations = occurrences.map(({ fileName }) => fileName).join(', ');
            console.error(`❌ Duplicate "${key}" in: ${locations}`);
        }
        process.exit(1);
    }
}

async function main() {
    console.log('⏳ Generating translations files...');
    const errorCodesByDomain = await getAllErrorCodes();
    checkForDuplicates(errorCodesByDomain);

    if (fs.existsSync(OUTPUT_PATH) === false) {
        fs.mkdirSync(OUTPUT_PATH, { recursive: true });
    }

    for (const language of translationLanguages) {
        const outputFilePath = path.join(OUTPUT_PATH, `${language}.translations.ts`);
        const existingTranslations = await readExistingTranslations(outputFilePath);
        const content = generateTranslationFile(language, errorCodesByDomain, existingTranslations);
        fs.writeFileSync(outputFilePath, content, 'utf-8');
    }

    console.log('✅ Translation files generated');
}

main();
