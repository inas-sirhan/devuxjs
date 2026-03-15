export function isKebabCase(str: string): boolean {
    return /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(str);
}

export function kebabToPascalCase(kebab: string): string {
    return kebab
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
}

export function kebabToCamelCase(kebab: string): string {
    const pascal = kebabToPascalCase(kebab);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

export function pascalToKebabCase(pascal: string): string {
    return pascal
        .replace(/([A-Z])/g, '-$1')
        .toLowerCase()
        .replace(/^-/, '');
}

export function camelToKebabCase(camel: string): string {
    return camel
        .replace(/([A-Z])/g, '-$1')
        .toLowerCase();
}
