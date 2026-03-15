import type { DB } from '@/infrastructure/database/kysely/kysely.database.generated.types';
import type { ColumnType } from 'kysely';


export type SelectableOnlyNumber = ColumnType<number, never, never>;

type ReplaceField<T, K extends keyof T, V> = Omit<T, K> & { [P in K]: V };

type ReplaceFieldsMulti<
    T,
    Replacements extends [keyof T, any][]
> = Replacements extends []
    ? T
    : Replacements extends [[infer K, infer V], ...infer Rest]
        ? K extends keyof T
            ? Rest extends [ [keyof T, any], ...any[] ] | []
                ? ReplaceFieldsMulti<ReplaceField<T, K, V>, Rest>
                : never
            : never
        : never;



export type FixedDB = ReplaceFieldsMulti<
    DB,
    [

    ]
>;


//usage example:
/*

type FixedUsers = ReplaceFieldsMulti<
    DB['users'],
    [
        ['role', UsersBase['role']],
    ]
>;

type FixedCustomers = ReplaceFieldsMulti<
    DB['customers'],
    [
        ['customerId', SelectableOnlyNumber],
    ]
>;

export type FixedDB = ReplaceFieldsMulti<
    DB,
    [
        ['users', FixedUsers],
        ['customers', FixedCustomers]
    ]
>;

*/