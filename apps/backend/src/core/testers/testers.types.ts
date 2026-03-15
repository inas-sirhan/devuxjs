import type { Newable } from 'inversify';


export type BindingEntry<T> =
    | { type: 'value'; value: T }
    | { type: 'singleton'; impl: Newable<T> };
