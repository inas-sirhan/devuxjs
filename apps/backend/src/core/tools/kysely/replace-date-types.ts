import { readFileSync, writeFileSync } from 'fs';
import { Project, SyntaxKind } from 'ts-morph';

const GENERATED_FILE = './src/infrastructure/database/kysely/kysely.database.generated.types.ts';

export function replaceDateTypes() {
    let content = readFileSync(GENERATED_FILE, 'utf-8');
    content = content.replace(/^\/\*\*[\s\S]*?\*\/\s*/, '');
    writeFileSync(GENERATED_FILE, content);

    const project = new Project({
        skipLoadingLibFiles: true,
    });

    const file = project.addSourceFileAtPath(GENERATED_FILE);
    const typeReferences = file.getDescendantsOfKind(SyntaxKind.TypeReference);

    for (const typeRef of typeReferences) {
        if (typeRef.getText() === 'Date') {
            typeRef.replaceWithText('string');
        }
    }

    file.saveSync();
}
