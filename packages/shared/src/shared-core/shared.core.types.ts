

type ArrayedPathMaxDepth = 10;

export type ArrayedPath<T, Prev extends (string | number)[] = [], Depth extends unknown[] = []> =
    Depth['length'] extends ArrayedPathMaxDepth ? Prev :
    T extends readonly (infer U)[]
        ? | [...Prev, number]
          | ArrayedPath<U, [...Prev, number], [...Depth, unknown]>
        : T extends object
            ? {
                [K in keyof T & (string | number)]:
                    | [...Prev, K]
                    | ArrayedPath<T[K], [...Prev, K], [...Depth, unknown]>
            }[keyof T & (string | number)]
            : Prev;


export type ExcludeUndefined<T> = T extends object
    ? { [K in keyof T]: Exclude<T[K], undefined> }
    : T;

export type ExcludeUndefinedDeep<T> = T extends object
    ? { [K in keyof T]: ExcludeUndefinedDeep<Exclude<T[K], undefined>> }
    : T;


export type ValueOf<T> = T[keyof T];

