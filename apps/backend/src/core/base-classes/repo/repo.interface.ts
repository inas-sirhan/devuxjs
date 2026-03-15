import type { RepoInput, RepoOutput } from '@/core/base-classes/repo/repo.types';


export interface IRepo<TInput extends RepoInput, TOutput extends RepoOutput> {
    execute(input: TInput): Promise<TOutput>;
}
