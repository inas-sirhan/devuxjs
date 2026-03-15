import { camelToSnakeCase } from '@/core/utils/case-transformer.core.utils';
import { integer, timestamp, pgTable } from 'drizzle-orm/pg-core';
import type { BuildColumns } from 'drizzle-orm';

const POSTGRES_MAX_IDENTIFIER_LENGTH = 63;
const globalConstraintNamesSet: Set<string> = new Set();

type ConstraintsConfig<
    TUniques extends Record<string, string>,
    TForeigns extends Record<string, string>
> = {
    Uniques: TUniques;
    Foreigns: TForeigns;
};

type ConstraintsResult<
    TUniques extends Record<string, string>,
    TForeigns extends Record<string, string>
> = {
    Uniques: { readonly [K in keyof TUniques]: TUniques[K] };
    Foreigns: { readonly [K in keyof TForeigns]: TForeigns[K] };
};

export function defineDrizzleConstraintsNames<
    const TUniques extends Record<string, string>,
    const TForeigns extends Record<string, string>
>(config: ConstraintsConfig<TUniques, TForeigns>): ConstraintsResult<TUniques, TForeigns> {
    const allValues: string[] = [
        ...Object.values(config.Uniques),
        ...Object.values(config.Foreigns),
    ];

    for (const value of allValues) {
        if (value.length > POSTGRES_MAX_IDENTIFIER_LENGTH) {
            throw new Error(`Constraint name "${value}" exceeds PostgreSQL max identifier length of ${POSTGRES_MAX_IDENTIFIER_LENGTH} chars (got ${value.length})`);
        }

        const lowered = value.toLowerCase();
        if (globalConstraintNamesSet.has(lowered) === true) {
            throw new Error(`Duplicate constraint name detected: "${value}". Constraint names must be unique across all tables.`);
        }
        globalConstraintNamesSet.add(lowered);
    }

    return config as ConstraintsResult<TUniques, TForeigns>;
}


const kebabCaseRegex = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const globalTableNamesSet: Set<string> = new Set();

function integerPrimaryKey(colName: string) {
    return integer(colName).primaryKey().generatedAlwaysAsIdentity().notNull();
}
function timestampZ(colName: string) {
    return timestamp(colName, { withTimezone: true });
}

const columnUtils = {
    integerPrimaryKey,
    timestampZ,
};

type MergeObjects<T extends readonly Record<string, any>[]> = T extends readonly [infer First, ...infer Rest]
    ? First extends Record<string, any>
        ? Rest extends readonly Record<string, any>[]
            ? First & MergeObjects<Rest>
            : First
        : {}
    : {};

type ColFn = <
    Key extends string,
    TColFn extends (colName: string) => any,
    ColType extends ReturnType<TColFn>,
    FinalType extends ColType = ColType
>(
    key: Key,
    baseColumn: TColFn,
    chainFn?: (col: ColType) => FinalType
) => { [K in Key]: FinalType };

export function createDrizzleTable<
    TCols extends readonly Record<string, any>[],
>(
    tableName: string,
    columnsBuilder: (col: ColFn, utils: typeof columnUtils) => [...TCols],
    constraintsBuilder?: (table: BuildColumns<string, MergeObjects<TCols>, 'pg'>) => any[]
) {
    if (kebabCaseRegex.test(tableName) === false) {
        throw new Error(`Table name "${tableName}" must be in kebab-case (e.g., "users", "monthly-summary")`);
    }
    if (globalTableNamesSet.has(tableName) === true) {
        throw new Error(`Table name "${tableName}" has already been defined`);
    }
    globalTableNamesSet.add(tableName);

    const loweredColsNamesSet = new Set<string>();
    const snakeTableName = tableName.replace(/-/g, '_');

    const col: ColFn = (key, baseColumn, chainFn) => {
        const lowered = key.toLowerCase();
        if (loweredColsNamesSet.has(lowered) === true) {
            throw new Error(`Column "${key}" has already been defined`);
        }
        loweredColsNamesSet.add(lowered);
        const snake = camelToSnakeCase(key);
        const column = baseColumn(snake);
        const final = chainFn === undefined ? column : chainFn(column);
        return { [key]: final } as any;
    };

    const columnsArray = columnsBuilder(col, columnUtils);
    const columns = Object.assign({}, ...columnsArray) as MergeObjects<TCols>;

    return pgTable(snakeTableName, columns, constraintsBuilder as any);
}

