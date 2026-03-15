import type { IDatabaseTransactionConnectionProvider } from '@/core/core-injectables/database/database-transaction-connection-provider/database-transaction-connection-provider.interface';
import type { DatabaseTransactionConnection } from '@/core/core-injectables/database/database-transaction-manager/database-transaction-manager.types';
import { injectable } from 'inversify';



@injectable() 
export class DatabaseTransactionConnectionProvider implements IDatabaseTransactionConnectionProvider {

    protected transactionConnection: DatabaseTransactionConnection | null = null;

    public getTransactionConnection(): DatabaseTransactionConnection | null {
        return this.transactionConnection;
    }

    public setTransactionConnection(transactionConnection: DatabaseTransactionConnection): void {
        this.transactionConnection = transactionConnection;
    }

}