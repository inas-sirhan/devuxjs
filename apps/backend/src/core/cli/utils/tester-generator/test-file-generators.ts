import path from 'path';
import fs from 'fs';
import { kebabToPascalCase } from '@/core/cli/utils/case-converter';
import { BACKEND_SRC_PATH } from '@/core/cli/utils/cli-constants';


export function generateEndpointTestFiles(domain: string, endpointId: string): void {
    const endpointPascal = kebabToPascalCase(endpointId);
    const internalsBasePath = `@/__internals__/domains/${domain}/endpoints/${endpointId}`;
    const appLayerTestsPath = path.join(
        BACKEND_SRC_PATH, 'domains', domain, 'endpoints', endpointId, 'tests'
    );

    fs.mkdirSync(appLayerTestsPath, { recursive: true });

    const useCaseTestFilePath = path.join(appLayerTestsPath, `${endpointId}.use-case.test.ts`);
    const useCaseTestFileContent = `import { describe, it, expect, beforeEach } from 'vitest';
import { ${endpointPascal}Tester } from '${internalsBasePath}/${endpointId}.tester';

describe('${endpointId} use-case', () => {
    it.todo('test the use-case with no http layer');
});
`;
    fs.writeFileSync(useCaseTestFilePath, useCaseTestFileContent);

    const e2eTestFilePath = path.join(appLayerTestsPath, `${endpointId}.e2e.test.ts`);
    const e2eTestFileContent = `import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fetchCookie from 'fetch-cookie';
import { ${endpointPascal}E2ETester } from '${internalsBasePath}/${endpointId}.e2e.tester';

// const customFetch = fetchCookie(fetch);

describe('${endpointId} e2e', () => {
    it.todo('test the endpoint e2e');
});
`;
    fs.writeFileSync(e2eTestFilePath, e2eTestFileContent);
}


export interface GenerateRepoTestFileParams {
    repoType: 'endpoint' | 'domain' | 'service';
    domainName: string;
    repoName: string;
    endpointId?: string;
    serviceName?: string;
}

export function generateRepoTestFile(params: GenerateRepoTestFileParams): void {
    const { repoType, domainName, repoName, endpointId, serviceName } = params;
    const repoPascal = kebabToPascalCase(repoName);

    let appLayerTestsPath: string;
    let internalsBasePath: string;

    if (repoType === 'endpoint') {
        appLayerTestsPath = path.join(
            BACKEND_SRC_PATH, 'domains', domainName, 'endpoints', endpointId!, 'repos', repoName, 'tests'
        );
        internalsBasePath = `@/__internals__/domains/${domainName}/endpoints/${endpointId}/repos/${repoName}`;
    }
    else {
        if (repoType === 'domain') {
            appLayerTestsPath = path.join(
                BACKEND_SRC_PATH, 'domains', domainName, 'repos', repoName, 'tests'
            );
            internalsBasePath = `@/__internals__/domains/${domainName}/repos/${repoName}`;
        }
        else {
            appLayerTestsPath = path.join(
                BACKEND_SRC_PATH, 'domains', domainName, 'services', serviceName!, 'repos', repoName, 'tests'
            );
            internalsBasePath = `@/__internals__/domains/${domainName}/services/${serviceName}/repos/${repoName}`;
        }
    }

    fs.mkdirSync(appLayerTestsPath, { recursive: true });

    const testFilePath = path.join(appLayerTestsPath, `${repoName}.repo.test.ts`);
    const testFileContent = `import { describe, it, expect, beforeEach } from 'vitest';
import { ${repoPascal}RepoTester } from '${internalsBasePath}/${repoName}.repo.tester';

describe('${repoName} repo', () => {
    it.todo('test the repo');
});
`;
    fs.writeFileSync(testFilePath, testFileContent);
}


export function generateDomainServiceTestFile(domainName: string, serviceName: string): void {
    const servicePascal = kebabToPascalCase(serviceName);
    const internalsBasePath = `@/__internals__/domains/${domainName}/services/${serviceName}`;
    const appLayerTestsPath = path.join(
        BACKEND_SRC_PATH, 'domains', domainName, 'services', serviceName, 'tests'
    );

    fs.mkdirSync(appLayerTestsPath, { recursive: true });

    const testFilePath = path.join(appLayerTestsPath, `${serviceName}.test.ts`);
    const testFileContent = `import { describe, it, expect, beforeEach } from 'vitest';
import { ${servicePascal}Tester } from '${internalsBasePath}/${serviceName}.tester';

describe('${serviceName} service', () => {
    it.todo('test the service');
});
`;
    fs.writeFileSync(testFilePath, testFileContent);
}


export function generateAppServiceTestFile(serviceName: string): void {
    const servicePascal = kebabToPascalCase(serviceName);
    const internalsBasePath = `@/__internals__/app-services/${serviceName}`;
    const appLayerTestsPath = path.join(
        BACKEND_SRC_PATH, 'app-services', serviceName, 'tests'
    );

    fs.mkdirSync(appLayerTestsPath, { recursive: true });

    const testFilePath = path.join(appLayerTestsPath, `${serviceName}.test.ts`);
    const testFileContent = `import { describe, it, expect, beforeEach } from 'vitest';
import { ${servicePascal}Tester } from '${internalsBasePath}/${serviceName}.tester';

describe('${serviceName} app-service', () => {
    it.todo('test the app service');
});
`;
    fs.writeFileSync(testFilePath, testFileContent);
}
