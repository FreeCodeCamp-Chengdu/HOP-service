import { RepositoryModel } from 'mobx-github';

import { GitTemplate, HackathonBase } from '../model';
import { UserServiceWithLog } from './User';

export class GitTemplateService extends UserServiceWithLog<GitTemplate> {
    #repositoryStore = new RepositoryModel();

    async getRepository(URI: string): Promise<Omit<GitTemplate, keyof HackathonBase>> {
        const path = URI.replace(new RegExp(String.raw`^https://github.com/`), 'repos');

        const repository = await this.#repositoryStore.getOne(path, ['languages']);

        const { name, full_name, html_url, default_branch } = repository,
            { languages, topics, description, homepage } = repository;
        return {
            ...{ name, full_name, html_url, default_branch },
            ...{ languages, topics, description, homepage }
        };
    }
}

export const gitTemplateService = new GitTemplateService(GitTemplate, [
    'name',
    'full_name',
    'html_url',
    'default_branch',
    'languages',
    'topics',
    'description',
    'homepage'
]);
