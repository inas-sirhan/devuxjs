import { RepoBase } from '@/core/base-classes/repo/repo.base';
import { fullInjectable } from '@/core/utils/core.utils';
import type { RepoInput, RepoOutput } from '@/core/base-classes/repo/repo.types';
import type { DatabaseConnectionPool } from '@/core/core-injectables/database/database-connection-pool/database-connection-pool.type';
import { injectDatabaseConnectionPool } from '@/core/core-injectables/database/database-connection-pool/database-connection-pool.inversify.tokens';

@fullInjectable()
export abstract class NonTransactionalRepo<TInput extends RepoInput, TOutput extends RepoOutput> extends RepoBase<TInput, TOutput> {

    @injectDatabaseConnectionPool() private readonly connectionPool!: DatabaseConnectionPool;

    protected get db(): DatabaseConnectionPool {
        return this.connectionPool;
    }
    
}
