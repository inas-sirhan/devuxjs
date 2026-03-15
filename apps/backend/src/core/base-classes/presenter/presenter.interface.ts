import type { Responses, ValidResponsesOrNever } from '@/core/types/core.types';


export interface IPresenter<TResponses extends Responses> {
    present<K extends keyof ValidResponsesOrNever<TResponses>>(
        key: K,
        ...args: Parameters<ValidResponsesOrNever<TResponses>[K]['value']>
    ): void;
}

