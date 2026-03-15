import fs from 'fs';
import path from 'path';
import * as p from '@clack/prompts';
import { isKebabCase, kebabToPascalCase, kebabToCamelCase } from '@/core/cli/utils/case-converter';


const __dirname = import.meta.dirname;

const DRIZZLE_TABLES_PATH = path.join(__dirname, '..', '..', '..', 'infrastructure', 'database', 'drizzle', 'tables');

function validateTableName(value: string | undefined): string | undefined {
    if (value === undefined || value === '') {
        return 'Table name is required';
    }
    if (isKebabCase(value) === false) {
        return 'Table name must be in kebab-case (e.g., monthly-summary)';
    }
    const tableFolderPath = path.join(DRIZZLE_TABLES_PATH, value);
    if (fs.existsSync(tableFolderPath) === true) {
        return `Table "${value}" already exists`;
    }
    return undefined;
}

function generateTableFileContent(tableNameKebab: string, tableNamePascal: string, tableNameCamel: string): string {
    return `import { createDrizzleTable } from '@/core/tools/drizzle/drizzle.utils';
import { text, integer, unique, foreignKey, index } from 'drizzle-orm/pg-core';
import { ${tableNamePascal}ConstraintsNames } from '@/infrastructure/database/drizzle/tables/${tableNameKebab}/${tableNameKebab}.drizzle.constraints-names';

export const ${tableNameCamel}Table = createDrizzleTable('${tableNameKebab}', (col, utils) => [

], (table) => [

]);
`;
}

function generateConstraintsNamesFileContent(tableNamePascal: string): string {
    return `import { defineDrizzleConstraintsNames } from '@/core/tools/drizzle/drizzle.utils';

export const ${tableNamePascal}ConstraintsNames = defineDrizzleConstraintsNames({
    Uniques: {
    
    },
    
    Foreigns: {
    
    },
});
`;
}

async function createDrizzleTable(): Promise<void> {
    const tableName = await p.text({
        message: 'Enter table name (kebab-case):',
        placeholder: 'e.g., monthly-summary, order-items',
        validate: validateTableName,
    });

    if (p.isCancel(tableName) === true) {
        p.log.info('Cancelled.');
        return;
    }

    const tableNameKebab = tableName;
    const tableNamePascal = kebabToPascalCase(tableNameKebab);
    const tableNameCamel = kebabToCamelCase(tableNameKebab);

    const s = p.spinner();
    s.start('Generating drizzle table files...');

    const tableFolderPath = path.join(DRIZZLE_TABLES_PATH, tableNameKebab);
    fs.mkdirSync(tableFolderPath, { recursive: true });

    const tableFilePath = path.join(tableFolderPath, `${tableNameKebab}.drizzle.table.ts`);
    const constraintsNamesFilePath = path.join(tableFolderPath, `${tableNameKebab}.drizzle.constraints-names.ts`);

    fs.writeFileSync(tableFilePath, generateTableFileContent(tableNameKebab, tableNamePascal, tableNameCamel));
    fs.writeFileSync(constraintsNamesFilePath, generateConstraintsNamesFileContent(tableNamePascal));

    s.stop('Drizzle table generated successfully!');
}

async function main(): Promise<void> {
    p.intro('Drizzle Table Generator');

    await createDrizzleTable();

    p.outro('Done!');
}

await main();
