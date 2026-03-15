import type { IPresenter } from '@/core/base-classes/presenter/presenter.interface';
import type { ExtractResponsesSchemasTypes, Responses, ValidResponsesOrNever } from '@/core/types/core.types';
import { coreConfig } from '@/infrastructure/core/core.config';


export abstract class Presenter<TResponses extends Responses> implements IPresenter<TResponses> {

    public present<K extends keyof ValidResponsesOrNever<TResponses>>(key: K, ...args: Parameters<ValidResponsesOrNever<TResponses>[K]['value']>): void {
        if (this.response !== null) {
            throw new Error(`Presenter response already set to '${String(this.responseKey)}'. Cannot set again.`);
        }
        const response = this.getResponses()[key].value(...args);
        if (coreConfig.isProduction === false) {
            const validation = this.getResponses()[key].schema.strict().safeParse(response);
            if (validation.success === false) {
                throw new Error(`Presenter response validation failed in ${this.constructor.name} for key "${String(key)}": ${JSON.stringify(validation.error.issues, null, 2)}`);
            }
        }
        this.response = response;
        this.responseKey = key; 
    }

    private response: ExtractResponsesSchemasTypes<TResponses>[keyof ExtractResponsesSchemasTypes<TResponses>] | null = null;
    private responseKey: keyof ValidResponsesOrNever<TResponses> | null = null;

    public getResponseKeyOrThrow() {
        if (this.responseKey === null) {
            throw new Error("presenter's response-key is null... (a response was not set)");
        }
        return this.responseKey;
    }

    public getResponseOrThrow() {
        if (this.response === null) {
            throw new Error("presenter's response is null... (a response was not set)");
        }
        return this.response;
    }

    public abstract getResponses(): ValidResponsesOrNever<TResponses>;

}
