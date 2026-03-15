import { RepoBase } from '@/core/base-classes/repo/repo.base';
import { fullInjectable } from '@/core/utils/core.utils';
import type { RepoInput, RepoOutput } from '@/core/base-classes/repo/repo.types';
import { injectDatabaseTransactionConnectionProvider } from '@/core/core-injectables/database/database-transaction-connection-provider/database-transaction-connection-provider.inversify.tokens';
import type { IDatabaseTransactionConnectionProvider } from '@/core/core-injectables/database/database-transaction-connection-provider/database-transaction-connection-provider.interface';
import type { DatabaseTransactionConnection } from '@/core/core-injectables/database/database-transaction-manager/database-transaction-manager.types';

@fullInjectable()
export abstract class TransactionalRepo<TInput extends RepoInput, TOutput extends RepoOutput> extends RepoBase<TInput, TOutput> {

    @injectDatabaseTransactionConnectionProvider() private readonly connectionProvider!: IDatabaseTransactionConnectionProvider;

    protected get trx(): DatabaseTransactionConnection {
        const connection = this.connectionProvider.getTransactionConnection();
        if (connection === null) {
            throw new Error('[TransactionalRepo Error]: No active transaction connection');
        }
        return connection;
    }
}
