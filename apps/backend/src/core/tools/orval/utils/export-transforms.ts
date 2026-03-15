import { type TypeAliasDeclaration } from 'ts-morph';
import { type Transform } from './transform-utils';


const EXPORT_LENGTH = 'export '.length;

export function removeTypeAliasExports(typeAliases: TypeAliasDeclaration[], content: string, transforms: Transform[]): void {
    for (const typeAlias of typeAliases) {
        const name = typeAlias.getName();
        if (name.endsWith('QueryError') === true) {
            continue;
        }

        const pos = typeAlias.getStart();
        if (content.slice(pos, pos + EXPORT_LENGTH) !== 'export ') {
            continue;
        }

        transforms.push({ start: pos, end: pos + EXPORT_LENGTH, newText: '' });
    }
}


// function removeUnwantedFunctionsExports(varDeclarations: VariableDeclaration[], content: string, transforms: Transform[], queryKeyFnNames: Set<string>): void {
//     for (const varDecl of varDeclarations) {
//         const varName = varDecl.getName();
//
//         if (queryKeyFnNames.has(varName) === true) {
//             continue;
//         }
//
//         const initializer = varDecl.getInitializer();
//         if (initializer === undefined || initializer.isKind(SyntaxKind.ArrowFunction) === false) {
//             continue;
//         }
//
//         const varStatement = varDecl.getFirstAncestorByKind(SyntaxKind.VariableStatement);
//         if (varStatement === undefined) {
//             continue;
//         }
//
//         const pos = varStatement.getStart();
//         if (content.slice(pos, pos + 7) !== 'export ') {
//             continue;
//         }
//
//         transforms.push({ start: pos, end: pos + 7, newText: '' });
//     }
// }
