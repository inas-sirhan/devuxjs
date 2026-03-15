



export function camelToSnakeCase(key: string): string {
    if (key.length === 0) {
        throw new Error("empty camelCase key in camelToSnakeCase converter");
    }

    if (/^[a-z][a-zA-Z0-9]*$/.test(key) === false) {
        throw new Error(`Invalid camelCase key: "${key}" in camelToSnakeCase converter`);
    }
    return key
        .replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
        .replace(/([a-z])([0-9])/g, '$1_$2');
}


export function snakeToCamelCase(key: string): string {
    if (key.length === 0) {
        throw new Error("empty snake_case key in snakeToCamelCase converter");
    }

    if (/^[a-z][a-z0-9_]*[a-z0-9]$/.test(key) === false || /__/.test(key) === true) {
        throw new Error(`Invalid snake_case key "${key}" passed to snakeToCamelCase`);
    }
    return key.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
}