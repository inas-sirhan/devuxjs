import '@/core/utils/load-env';
import type { FixedDB } from '@/infrastructure/database/kysely/kysely.database.fixed.types';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { types } from 'pg';
import { MyCaseTransformerKyselyPlugin } from '@/infrastructure/database/kysely/plugins/case-transformer.kysely.plugin';
import { minutesToMillis, secondsToMillis } from '@/core/utils/core.utils'; 


// All date/time types as strings
types.setTypeParser(1082, (val) => val); // DATE
types.setTypeParser(1114, (val) => val); // TIMESTAMP
types.setTypeParser(1184, (val) => val.replace(' ', 'T').replace('+00', 'Z')); // TIMESTAMPTZ

// Array types 
types.setTypeParser(1182 as any, (val) => types.arrayParser(val, (entry) => entry)); // DATE[]
types.setTypeParser(1115 as any, (val) => types.arrayParser(val, (entry) => entry)); // TIMESTAMP[]
types.setTypeParser(1185 as any, (val) => types.arrayParser(val, (entry) => entry.replace(' ', 'T').replace('+00', 'Z'))); // TIMESTAMPTZ[]


export function createDatabasePool(connectionString: string) {

    const pool = new Pool({
        connectionString,
        min: 0,
        max: 10,

        idleTimeoutMillis: minutesToMillis(2),
        connectionTimeoutMillis: secondsToMillis(3),

        idle_in_transaction_session_timeout: secondsToMillis(15),

        lock_timeout: secondsToMillis(15),

        maxLifetimeSeconds: 60 * 30,
        maxUses: 500,

        client_encoding: 'UTF8',

        statement_timeout: secondsToMillis(15),
        query_timeout: secondsToMillis(30),

        keepAlive: true,
        keepAliveInitialDelayMillis: secondsToMillis(30),

        allowExitOnIdle: false,
    });

    pool.on('connect', (client) => {

        // eslint-disable-next-line promise/prefer-await-to-then
        client.query(`SET TIME ZONE 'UTC'`).catch(_error => {
            client.release(true);
        });

    });
    return pool;
}


export function createKyselyClient(connectionString: string) {
    return new Kysely<KyselyDatabaseTables>({
        dialect: new PostgresDialect({
            pool: createDatabasePool(connectionString),
        }),
        plugins: [
            new MyCaseTransformerKyselyPlugin(),
        ],
    });
}

export const kyselyDatabaseClient = createKyselyClient(process.env.DATABASE_URL!);

export type KyselyDatabaseTables = FixedDB;
export type KyselyDatabaseConnectionPool = typeof kyselyDatabaseClient;
// export type KyselyDatabaseSingleConnection = Parameters<ReturnType<KyselyDatabaseConnectionPool['connection']>['execute']>[0] extends (conn: infer C) => any ? C : never;
export type KyselyDatabaseTransactionConnection = Awaited<ReturnType<KyselyDatabaseConnectionPool['startTransaction']> extends { execute: (...args: any) => infer R } ? R : never>;

