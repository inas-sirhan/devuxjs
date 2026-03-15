import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const generateSourcemap = true;
const isSourcemapPrivate = true; 

function validateDependencies() {
    const errors = [];

    const backendPkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));
    const sharedPkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'packages', 'shared', 'package.json'), 'utf-8'));

    const backendDeps = backendPkg.dependencies || {};
    const backendDevDeps = backendPkg.devDependencies || {};
    const sharedDeps = sharedPkg.dependencies || {};
    const sharedDevDeps = sharedPkg.devDependencies || {};

    for (const [pkg, version] of Object.entries(backendDeps)) {
        if (typeof version === 'string' && (version.startsWith('^') || version.startsWith('~'))) {
            errors.push(`❌ Backend dependency "${pkg}" uses range version: ${version} (must be exact)`);
        }
    }

    for (const [pkg, version] of Object.entries(backendDevDeps)) {
        if (typeof version === 'string' && (version.startsWith('^') || version.startsWith('~'))) {
            errors.push(`❌ Backend devDependency "${pkg}" uses range version: ${version} (must be exact)`);
        }
    }

    for (const [pkg, version] of Object.entries(sharedDeps)) {
        if (typeof version === 'string' && (version.startsWith('^') || version.startsWith('~'))) {
            errors.push(`❌ Shared dependency "${pkg}" uses range version: ${version} (must be exact)`);
        }
    }

    for (const [pkg, version] of Object.entries(sharedDevDeps)) {
        if (typeof version === 'string' && (version.startsWith('^') || version.startsWith('~'))) {
            errors.push(`❌ Shared devDependency "${pkg}" uses range version: ${version} (must be exact)`);
        }
    }

    const allSharedDeps = { ...sharedDeps, ...sharedDevDeps };
    const allBackendDeps = { ...backendDeps, ...backendDevDeps };

    for (const [pkg, sharedVersion] of Object.entries(allSharedDeps)) {
        const backendVersion = allBackendDeps[pkg];
        if (backendVersion && backendVersion !== sharedVersion) {
            errors.push(`❌ Version mismatch: "${pkg}" - backend has ${backendVersion}, shared has ${sharedVersion}`);
        }
    }

    if (errors.length > 0) {
        console.error('Build failed:\n');
        console.error(errors.join('\n'));
        process.exit(1);
    }

}

validateDependencies();


const TMP_DIST = path.join(__dirname, 'tmp-dist');
const DIST = path.join(__dirname, 'dist');
const SOURCEMAPS = path.join(__dirname, 'sourcemaps');

build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    platform: 'node',
    target: ['node22'],
    outfile: path.join(TMP_DIST, 'index.js'),
    format: 'esm',
    tsconfig: 'tsconfig.json',
    minify: true,
    keepNames: true,
    sourcemap: generateSourcemap ? (isSourcemapPrivate ? 'external' : true) : false,
    treeShaking: true,
    packages: 'external',

}).then(() => {

    fs.mkdirSync(DIST, { recursive: true });

    if (generateSourcemap) {
        if (isSourcemapPrivate) {
            fs.mkdirSync(SOURCEMAPS, { recursive: true });
            fs.renameSync(
                path.join(TMP_DIST, 'index.js.map'),
                path.join(SOURCEMAPS, 'index.js.map')
            );
        }
        else {
            fs.renameSync(
                path.join(TMP_DIST, 'index.js.map'),
                path.join(DIST, 'index.js.map')
            );
        }
    }

    fs.renameSync(
        path.join(TMP_DIST, 'index.js'),
        path.join(DIST, 'index.js')
    );

    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));

    if (packageJson.dependencies) {
        for (const [key, value] of Object.entries(packageJson.dependencies)) {
            if (typeof value === 'string' && value.startsWith('workspace:')) {
                delete packageJson.dependencies[key];
                console.log(`Removed workspace dependency: ${key}`);
            }
        }
    }

    delete packageJson.devDependencies;
    delete packageJson.peerDependencies;
    packageJson.scripts = { 
        start: packageJson.scripts?.start
    };

    fs.writeFileSync(
        path.join(DIST, 'package.json'),
        JSON.stringify(packageJson, null, 2)
    );

    fs.rmSync(TMP_DIST, { recursive: true, force: true });

    console.log('✅ Build complete!');

}).catch((error) => {
    console.error(`error building app..:`, error);
    process.exit(1);
});

