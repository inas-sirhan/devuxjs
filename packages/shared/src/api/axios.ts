import Axios, { type AxiosRequestConfig } from "axios";
import qs from "qs";

const baseUrl = 'http://127.0.0.1:3000'; 

export const AXIOS_INSTANCE = Axios.create({
    baseURL: baseUrl,
    withCredentials: true,
    timeout: 30000,
    paramsSerializer: (params) =>
        qs.stringify(params, { arrayFormat: "brackets", allowEmptyArrays: true }),
    transitional: {
        clarifyTimeoutError: true,
    },
});

export const customInstance = <T>(
    config: AxiosRequestConfig,
    options?: AxiosRequestConfig
): Promise<T> => {
    const source = Axios.CancelToken.source();
    const promise = AXIOS_INSTANCE({
        ...config,
        ...options,
        cancelToken: source.token,
    })
        .then(({ data, status }) => (status === 204 ? null : data))
        .catch((error) => {
            if (Axios.isAxiosError(error) && error.response) {
                throw error.response.data;
            }

            throw error;
        });

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    promise.cancel = () => {
        source.cancel("Query was cancelled");
    };

    return promise;
};

export type ErrorType<Error> = Error;

