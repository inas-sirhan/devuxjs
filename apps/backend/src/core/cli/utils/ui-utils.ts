import * as p from '@clack/prompts';

export const BACK_VALUE = '← Back' as const;

type SelectOptions<T> = Parameters<typeof p.select<T>>[0]['options'];

export function withBackOption<T extends string>(options: SelectOptions<T>): SelectOptions<T | typeof BACK_VALUE> {
    return [
        ...options,
        { value: BACK_VALUE, label: BACK_VALUE },
    ];
}

export function handleCancel(): never {
    p.outro('Goodbye!');
    process.exit(0);
}

export function handleUnexpectedError(): never {
    p.log.error('An unexpected error happened. Please undo all changes carefully (git restore/clean..) and retry.');
    process.exit(1);
}


export async function selectAction<T extends string>(
    message: string,
    options: SelectOptions<T>
): Promise<T | null> {
    const selected = await p.autocomplete({
        message,
        options: withBackOption(options),
    });

    if (p.isCancel(selected) === true) {
        handleCancel();
    }
    if (selected === BACK_VALUE) {
        return null;
    }

    return selected as T;
}


export async function selectRequired<T extends string>(
    message: string,
    options: SelectOptions<T>
): Promise<T> {
    const selected = await p.autocomplete({
        message,
        options,
    });

    if (p.isCancel(selected) === true) {
        handleCancel();
    }

    return selected as T;
}


export async function confirmAction(message: string): Promise<boolean> {
    const confirmed = await p.confirm({
        message,
        initialValue: false,
    });

    if (p.isCancel(confirmed) === true || confirmed === false) {
        return false;
    }

    return true;
}


export async function promptText(
    message: string,
    validate: (value: string) => string | undefined
): Promise<string | null> {
    const value = await p.text({
        message,
        validate: (val) => {
            if (val === undefined) {
                return undefined;
            }
            return validate(val);
        },
    });

    if (p.isCancel(value) === true) {
        handleCancel();
    }

    return value;
}


export async function promptRequiredText(
    message: string,
    requiredMessage: string,
    validate: (value: string) => string | undefined
): Promise<string | null> {
    const value = await p.text({
        message,
        validate: (val) => {
            if (val === undefined || val === '') {
                return requiredMessage;
            }
            return validate(val);
        },
    });

    if (p.isCancel(value) === true) {
        handleCancel();
    }

    return value;
}
