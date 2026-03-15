


import { snakeToCamelCase, camelToSnakeCase } from '@/core/utils/case-transformer.core.utils';
import { CamelCasePlugin } from 'kysely';

export class MyCaseTransformerKyselyPlugin extends CamelCasePlugin {

    private cacheSnakeToCamel: Map<string, string>;
    private cacheCamelToSnake: Map<string, string>;

    public constructor() {
        super();
        this.cacheSnakeToCamel = new Map();
        this.cacheCamelToSnake = new Map();
    }

    private putInCaches(camel: string, snake: string) {
        this.cacheSnakeToCamel.set(snake, camel);
        this.cacheCamelToSnake.set(camel, snake);
    }

    protected override camelCase(snakeKey: string) : string {
        if (this.cacheSnakeToCamel.has(snakeKey) === true) {
            return this.cacheSnakeToCamel.get(snakeKey)!;
        }
        const camelRes = snakeToCamelCase(snakeKey);
        this.putInCaches(camelRes, snakeKey);
        return camelRes;
    }

    public override snakeCase(camelKey: string): string {
        if (this.cacheCamelToSnake.has(camelKey) === true) {
            return this.cacheCamelToSnake.get(camelKey)!;
        }
        const snakeRes = camelToSnakeCase(camelKey);
        this.putInCaches(camelKey, snakeRes);
        return snakeRes; 
    }

}

