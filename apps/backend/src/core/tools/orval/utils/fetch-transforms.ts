import { readFileSync, writeFileSync } from 'fs';
import { Project, SyntaxKind, type ArrowFunction } from 'ts-morph';
import path from 'path';
import { type Transform, applyTransforms } from './transform-utils';


export function postProcessFetchApi(allOperationsNames: string[]): void {
    const FETCH_API_PATH = path.resolve('./api/api.fetch.ts');

    let content = readFileSync(FETCH_API_PATH, 'utf-8');

    content = content.replace(/^\/\*\*[\s\S]*?\*\/\s*/, '');
    content = content.replace(/^\s*\/\/.*\n/gm, '');

    content = content.replace(
        /const normalizedParams = new URLSearchParams\([\s\S]*?const stringifiedParams = normalizedParams\.toString\(\);/g,
        'const stringifiedParams = qs.stringify(params, { arrayFormat: "brackets", allowEmptyArrays: true });'
    );

    if (content.includes('import qs') === false) {
        content = `import qs from "qs";\n${content}`;
    }

    const project = new Project({
        useInMemoryFileSystem: true,
        skipLoadingLibFiles: true,
    });
    const sourceFile = project.createSourceFile('api.fetch.ts', content);

    const transforms: Transform[] = [];
    const varDeclarations = sourceFile.getVariableDeclarations();

    for (const varDecl of varDeclarations) {
        const initializer = varDecl.getInitializer();
        if (initializer === undefined || initializer.isKind(SyntaxKind.ArrowFunction) === false) {
            continue;
        }

        const arrowFn = initializer as ArrowFunction;
        const params = arrowFn.getParameters();

        if (params.length < 2) {
            continue;
        }

        const firstParam = params[0];
        const secondParam = params[1];

        const firstParamTypeNode = firstParam.getTypeNode();
        const secondParamTypeNode = secondParam.getTypeNode();
        const firstParamType = firstParamTypeNode !== undefined ? firstParamTypeNode.getText() : '';
        const secondParamType = secondParamTypeNode !== undefined ? secondParamTypeNode.getText() : '';

        if (firstParamType.includes('PathParameters') === false) {
            continue;
        }

        const isBody = secondParamType.includes('Body');
        const isParams = secondParamType.includes('Params');
        if (isBody === false && isParams === false) {
            continue;
        }

        const bindingPattern = firstParam.getNameNode();
        if (bindingPattern.isKind(SyntaxKind.ObjectBindingPattern) === false) {
            continue;
        }

        const pathParamNames = bindingPattern.getElements().map(el => el.getName());
        const secondParamName = secondParam.getName();

        const newBindingPattern = `{ ${pathParamNames.join(', ')}, ...${secondParamName} }`;
        const cleanSecondType = secondParamType.replace(' | undefined', '');
        const newType = `${firstParamType} & ${cleanSecondType}`;
        const newParamText = `${newBindingPattern}: ${newType}`;

        transforms.push({
            start: firstParam.getStart(),
            end: secondParam.getEnd(),
            newText: newParamText
        });
    }

    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
    for (const callExpr of callExpressions) {
        const args = callExpr.getArguments();
        if (args.length < 2) {
            continue;
        }

        const firstArg = args[0];
        const secondArg = args[1];

        if (firstArg.isKind(SyntaxKind.ObjectLiteralExpression) === false) {
            continue;
        }
        if (secondArg.isKind(SyntaxKind.Identifier) === false) {
            continue;
        }

        const secondArgName = secondArg.getText();
        if (secondArgName.includes('param') === false && secondArgName.includes('Param') === false &&
            secondArgName.includes('body') === false && secondArgName.includes('Body') === false) {
            continue;
        }

        const props = firstArg.getProperties();
        const propNames = props.map(p => {
            if (p.isKind(SyntaxKind.ShorthandPropertyAssignment) === true) {
                return p.getName();
            }
            return null;
        }).filter((x): x is string => x !== null);

        if (propNames.length === 0) {
            continue;
        }

        const newArg = `{ ${propNames.join(', ')}, ...${secondArgName} }`;

        transforms.push({
            start: firstArg.getStart(),
            end: secondArg.getEnd(),
            newText: newArg
        });
    }

    content = applyTransforms(content, transforms);

    content = content.replace(/= async \(/g, '= async (customFetch: typeof fetch, ');
    content = content.replace(/await fetch\(/g, 'await customFetch(');

    content = content.replace(/^export /gm, '');

    const apiObject = `
export const Api = {
    ${allOperationsNames.join(',\n    ')}
} as const;
`;
    content += apiObject;

    content = `/* eslint-disable */\n// @ts-nocheck\n${content}`;

    writeFileSync(FETCH_API_PATH, content);
}
