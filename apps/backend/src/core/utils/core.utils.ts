

import { injectable, injectFromBase } from 'inversify';


export class ShouldNotBeReachedError extends Error {
    public constructor(value: unknown) {
        super('Unexpected exhausted [value: ' + value + "]");
    }
}

export function assertNeverReached(value: never): never {
    throw new ShouldNotBeReachedError(value);
}

export function throwUnexpectedError(message: string): never {
    throw new Error(message);
}

export function secondsToMillis(seconds: number): number {
    return  1000 * seconds;
}

export function minutesToMillis(minutes: number): number {
    return 1000 * 60 * minutes;
}

export function hoursToMillis(hours: number): number {
    return 1000 * 60 * 60 * hours;
}

export function fullInjectable(): ClassDecorator {
    return function (target: any) {
        injectable()(target);
        injectFromBase({
            extendConstructorArguments: true,
            extendProperties: true,
        })(target);
    };
}

export function joinDotted(path: (string | number)[]): string {
    return path.join('.');
}

export function isNotUndefinedOrNull<T>(value: T): value is Exclude<T, undefined | null>  {
    return value !== undefined && value !== null;
}

export function isUndefinedOrNull(value: unknown): value is undefined | null  {
    return isNotUndefinedOrNull(value) === false;
}

export function sleep(millis: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, millis));
}

// export const pickPath = <T>() => <P extends DottedPath<T> = DottedPath<T>>(path: P): P => path;
