import { intro, outro, select, isCancel, cancel, spinner } from '@clack/prompts';
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import dotenv from 'dotenv';
import { replaceDateTypes } from './kysely/replace-date-types';

type Target = 'drizzle' | 'kysely' | 'both';
type Env = 'development' | 'test' | 'both';

const COMMANDS = {
    drizzle: 'drizzle-kit push --config ./src/core/tools/drizzle/drizzle.config.ts',
    kysely: 'kysely-codegen --dialect postgres --out-file ./src/infrastructure/database/kysely/kysely.database.generated.types.ts --camel-case',
};

function parseEnv(env: 'development' | 'test') {
    const envFile = existsSync(`.env.${env}`) ? readFileSync(`.env.${env}`, 'utf-8') : '';
    const baseFile = existsSync('.env') ? readFileSync('.env', 'utf-8') : '';

    const envSpecific = dotenv.parse(envFile);
    const base = dotenv.parse(baseFile);
    return { 
        ...base, 
        ...envSpecific, 
        NODE_ENV: env
    };
}

function runCommand(command: string, env: 'development' | 'test', quiet: boolean = false) {
    const envVars = parseEnv(env);
    execSync(command, {
        stdio: quiet === true ? ['inherit', 'inherit', 'inherit'] : 'inherit',
        env: {
            ...process.env,
            ...envVars
        }
    });
}

function syncDb(target: Target, env: Env): void {
    const s = spinner();
    const envs: ('development' | 'test')[] = env === 'both' ? ['development', 'test'] : [env];
    const runDrizzle = target === 'drizzle' || target === 'both';
    const runKysely = target === 'kysely' || target === 'both';

    if (runDrizzle === true) {
        for (const currentEnv of envs) {
            s.start(`Syncing drizzle for ${currentEnv}...`);
            try {
                runCommand(COMMANDS.drizzle, currentEnv);
                s.stop(`Drizzle synced for ${currentEnv}`);
            }
            catch (error) {
                s.stop(`Failed to sync drizzle for ${currentEnv}`);
                throw error;
            }
        }
    }

    if (runKysely === true) {
        const kyselyEnv = envs[0];
        s.start(`Generating kysely types from ${kyselyEnv}...`);
        try {
            runCommand(COMMANDS.kysely, kyselyEnv, true);
            replaceDateTypes();
            s.stop(`Kysely types generated`);
        }
        catch (error) {
            s.stop(`Failed to generate kysely types`);
            throw error;
        }
    }
}

async function main() {
    intro('Database Sync');

    const target = await select({
        message: 'What do you want to sync?',
        options: [
            { value: 'both', label: 'Both (Drizzle + Kysely)' },
            { value: 'drizzle', label: 'Drizzle only (push schema)' },
            { value: 'kysely', label: 'Kysely only (generate types)' },
        ],
    });

    if (isCancel(target) === true) {
        cancel('Operation cancelled');
        process.exit(0);
    }

    const env = await select({
        message: 'Which environment?',
        options: [
            { value: 'development', label: 'Development' },
            { value: 'test', label: 'Test' },
            { value: 'both', label: 'Both' },
        ],
    });

    if (isCancel(env) === true) {
        cancel('Operation cancelled');
        process.exit(0);
    }

    syncDb(target, env);

    outro('Done!');
}

main().catch((error) => {
    console.error(`❌ Sync failed: ${error.message}`);
    process.exit(1);
});
