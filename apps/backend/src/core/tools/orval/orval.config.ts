import '../../utils/load-env';
import { writeFileSync } from 'fs';
import path from 'path';
import { postProcessApi } from './utils/react-query-transforms';
import { generateCustomHooks, generateApiNamespace } from './utils/custom-hooks-generator';
import { postProcessFetchApi } from './utils/fetch-transforms';


const getOperationsNames: string[] = [];
const allOperationsNames: string[] = [];


const SHARED_API_PATH = '../../../../../../packages/shared/src/api';
const API_FILE = `${SHARED_API_PATH}/api.react-query.ts`;
const AXIOS_FILE = `${SHARED_API_PATH}/axios.ts`;
const API_FILE_PATH = path.resolve('../../packages/shared/src/api/api.react-query.ts');
const FETCH_API_FILE_PATH = path.resolve('./api/api.fetch.ts');


export default {
    ReactQuery: {
        mode: '',
        input: '../../../../api/openapi.json',

        output: {
            prettier: false,
            target: API_FILE,
            client: 'react-query',
            httpClient: 'axios',
            urlEncodeParameters: true,

            override: {
                query: {
                    version: 5,
                },

                transformer: (operation: any) => {
                    allOperationsNames.push(operation.operationName);
                    if (operation.verb.toLowerCase() === 'get') {
                        getOperationsNames.push(operation.operationName);
                    }
                    return operation;
                },

                mutator: {
                    path: AXIOS_FILE,
                    name: 'customInstance',
                },

                useNamedParameters: true,
            },
        },

        hooks: {
            afterAllFilesWrite: () => {
                try {
                    postProcessApi(getOperationsNames, API_FILE_PATH);

                    const generatedHooks = generateCustomHooks(getOperationsNames);
                    writeFileSync(API_FILE_PATH, generatedHooks, { flag: 'a' });

                    generateApiNamespace(allOperationsNames, API_FILE_PATH);
                }
                catch (error) {
                    console.error('❌ Failed to generate the frontend api');
                    writeFileSync(API_FILE_PATH, 'Failed to generate the frontend api.', { flag: 'w' });
                    throw error;
                }
            }
        },
    },

    Fetch: {
        mode: '',
        input: '../../../../api/openapi.json',

        output: {
            baseUrl: `http://${process.env.HOST}:${process.env.PORT}`,
            prettier: false,
            target: '../../../../api/api.fetch.ts',
            client: 'fetch',
            urlEncodeParameters: true,

            override: {
                useNamedParameters: true,
            },
        },

        hooks: {
            afterAllFilesWrite: () => {
                try {
                    postProcessFetchApi(allOperationsNames);
                }
                catch (error) {
                    console.error('❌ Failed to generate the testing api');
                    writeFileSync(FETCH_API_FILE_PATH, 'Failed to generate the testing api.', { flag: 'w' });
                    throw error;
                }
            },
        },
    },
};
