import { Project, Scope, QuoteKind, type SourceFile, type ClassDeclaration } from 'ts-morph';


export function createOptimizedProject(): Project {
    return new Project({
        skipLoadingLibFiles: true,
        manipulationSettings: {
            quoteKind: QuoteKind.Single,
        },
    });
}


export interface AddInjectedPropertyParams {
    targetClass: ClassDeclaration;
    sourceFile: SourceFile;
    decoratorName: string;
    propertyName: string;
    typeName: string;
    scope: 'private' | 'protected';
}


export function removeStatementContaining(fn: { getStatements: () => { getText: () => string; remove: () => void }[] }, searchText: string): void {
    const statements = fn.getStatements();
    for (const statement of statements) {
        if (statement.getText().includes(searchText)) {
            statement.remove();
            break;
        }
    }
}


export function removePropertyByDecorator(targetClass: ClassDeclaration, decoratorName: string): void {
    const properties = targetClass.getProperties();
    const prop = properties.find(p => p.getDecorators().some(d => d.getName() === decoratorName));
    if (prop !== undefined) {
        prop.remove();
    }
}


export function ensureImport(sourceFile: SourceFile, importPath: string, namedImport: string, isTypeOnly = false): void {
    const existingImport = sourceFile.getImportDeclaration(importPath);
    if (existingImport === undefined) {
        sourceFile.addImportDeclaration({
            moduleSpecifier: importPath,
            namedImports: isTypeOnly ? [{ name: namedImport, isTypeOnly: true }] : [namedImport],
        });
    }
    else {
        const namedImports = existingImport.getNamedImports();
        const hasImport = namedImports.some(ni => ni.getName() === namedImport);
        if (hasImport === false) {
            if (isTypeOnly) {
                existingImport.addNamedImport({ name: namedImport, isTypeOnly: true });
            }
            else {
                existingImport.addNamedImport(namedImport);
            }
        }
    }
}


export function removeImport(sourceFile: SourceFile, importPath: string): void {
    const existingImport = sourceFile.getImportDeclaration(importPath);
    if (existingImport !== undefined) {
        existingImport.remove();
    }
}


export function addInjectedProperty(params: AddInjectedPropertyParams): void {
    const { targetClass, sourceFile, decoratorName, propertyName, typeName, scope } = params;

    const properties = targetClass.getProperties();
    let insertIndex = 0;
    for (let i = 0; i < properties.length; i++) {
        if (properties[i].getDecorators().some(d => d.getName().startsWith('inject'))) {
            insertIndex = i + 1;
        }
    }

    const tsMorphScope = scope === 'protected' ? Scope.Protected : Scope.Private;

    targetClass.insertProperty(insertIndex, {
        name: propertyName,
        type: typeName,
        scope: tsMorphScope,
        isReadonly: true,
        hasExclamationToken: true,
        decorators: [{ name: decoratorName, arguments: [] }],
    });

    const fileText = sourceFile.getFullText();
    const formattedText = fileText.replace(
        `@${decoratorName}()\n    ${scope} readonly ${propertyName}`,
        `@${decoratorName}() ${scope} readonly ${propertyName}`
    );
    sourceFile.replaceWithText(formattedText);
}
