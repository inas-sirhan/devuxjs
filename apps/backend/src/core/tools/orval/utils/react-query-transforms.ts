import { readFileSync, writeFileSync } from 'fs';
import { Node, Project, type VariableDeclaration } from 'ts-morph';
import { type Transform, removeDuplicateTransforms, applyTransforms, toPascal } from './transform-utils';
import { removeTypeAliasExports } from './export-transforms';
import { addDeepExpandType, wrapQueryErrorTypes, transformArrowFunctionTypeParams, transformFunctionDeclarationTypeParams } from './deep-expand-transforms';
import { transformArrowFunctionParams, transformFunctionDeclarationParams, transformTypeLiterals, transformVarStatements, transformCallExpressions } from './param-merging-transforms';


export const queryKeyParamsCache = new Map<string, { parameters: string[], paramNames: string[] }>();

export function cacheQueryKeyParams(varDeclarations: VariableDeclaration[], getOperationIds: string[]): void {
    for (const id of getOperationIds) {
        const queryKeyFn = `get${toPascal(id)}QueryKey`;
        const varDecl = varDeclarations.find(v => v.getName() === queryKeyFn);

        if (varDecl === undefined) {
            continue;
        }

        const initializer = varDecl.getInitializer();
        if (initializer === undefined || Node.isArrowFunction(initializer) === false) {
            continue;
        }

        const parameters = initializer.getParameters().map(p => p.getText().replace(/\?/g, ''));
        const paramNames = parameters.map((param: string) => param.split(':')[0].replace(/\n/g, '').replace(/\?/g, ''));

        queryKeyParamsCache.set(id, { parameters, paramNames });
    }
}


export function postProcessApi(getOperationIds: string[], apiFilePath: string): void {
    let content = readFileSync(apiFilePath, 'utf-8');

    content = content.replace(/^\/\*\*[\s\S]*?\*\/\s*/, '');
    content = content.replace(/^\s*\/\/.*\n/gm, '');

    const project = new Project({
        useInMemoryFileSystem: true,
        skipLoadingLibFiles: true,
    });
    const sourceFile = project.createSourceFile('api.react-query.ts', content);

    const transforms: Transform[] = [];

    const typeAliases = sourceFile.getTypeAliases();
    const varDeclarations = sourceFile.getVariableDeclarations();
    const functions = sourceFile.getFunctions();

    cacheQueryKeyParams(varDeclarations, getOperationIds);

    const queryKeyFnNames = new Set(
        getOperationIds.map(id => `get${toPascal(id)}QueryKey`)
    );

    removeTypeAliasExports(typeAliases, content, transforms);
    // removeUnwantedFunctionsExports(varDeclarations, content, transforms, queryKeyFnNames);
    addDeepExpandType(sourceFile, transforms);
    wrapQueryErrorTypes(typeAliases, transforms);
    transformArrowFunctionParams(varDeclarations, transforms, queryKeyFnNames);
    transformArrowFunctionTypeParams(varDeclarations, transforms, queryKeyFnNames);
    transformFunctionDeclarationParams(functions, transforms, queryKeyFnNames);
    transformFunctionDeclarationTypeParams(functions, transforms, queryKeyFnNames);
    transformTypeLiterals(sourceFile, transforms);
    transformVarStatements(sourceFile, transforms);
    transformCallExpressions(sourceFile, transforms, queryKeyFnNames);

    const uniqueTransforms = removeDuplicateTransforms(transforms);
    content = applyTransforms(content, uniqueTransforms);

    content = `/* eslint-disable */\n// @ts-nocheck\n${content}`;

    writeFileSync(apiFilePath, content);
}
