import { execFile, ExecFileOptions } from 'child_process';
import { copyFile, mkdir, mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { dirname, relative, resolve, sep } from 'path';
import { BadRequestError, NotFoundError } from 'routing-controllers';
import { Repository } from 'typeorm';
import { promisify } from 'util';

import {
    dataSource,
    GitUploadResult,
    OAuthCredential,
    OAuthPlatform,
    OAuthPlatformDomainMap
} from '../model';

const execFileAsync = promisify(execFile);

export interface IncomingGitFile {
    fieldname: string;
    path: string;
}

interface CommandResult {
    stdout: string;
}

type RunCommand = (
    command: string,
    args: (string | undefined)[],
    options?: ExecFileOptions
) => Promise<CommandResult>;

export interface GitFileServiceOptions {
    credentialStore: Pick<Repository<OAuthCredential>, 'findOneBy'>;
    gitUtilityCLI: string;
    runCommand: RunCommand;
    tempRoot: string;
}

export class GitFileService {
    credentialStore: GitFileServiceOptions['credentialStore'];
    gitUtilityCLI: string;
    runCommand: RunCommand;
    tempRoot: string;

    constructor({
        credentialStore = dataSource.getRepository(OAuthCredential),
        gitUtilityCLI = require.resolve('git-utility/dist/index.js'),
        runCommand = GitFileService.runCommand,
        tempRoot = tmpdir()
    }: Partial<GitFileServiceOptions> = {}) {
        this.credentialStore = credentialStore;
        this.gitUtilityCLI = gitUtilityCLI;
        this.runCommand = runCommand;
        this.tempRoot = tempRoot;
    }

    static async runCommand(
        command: string,
        args: (string | undefined)[],
        options: ExecFileOptions = {}
    ) {
        const { stdout } = await execFileAsync(
            command,
            args.filter((value): value is string => value !== undefined),
            { maxBuffer: 10 * 1024 * 1024, ...options }
        );

        return { stdout: stdout.toString() };
    }

    protected getPlatformByHost(host: string) {
        const matched = Object.entries(OAuthPlatformDomainMap).find(
            ([, domain]) => host.toLowerCase() === domain
        );

        if (!matched) throw new BadRequestError(`Unsupported Git repository host: ${host}`);

        return matched[0] as OAuthPlatform;
    }

    protected getGitAuthenticationEnv(host: string, userName: string, accessToken: string) {
        return {
            GIT_CONFIG_COUNT: '1',
            GIT_CONFIG_KEY_0: `http.https://${host}/.extraheader`,
            GIT_CONFIG_VALUE_0: `AUTHORIZATION: Basic ${Buffer.from(
                `${userName}:${accessToken}`
            ).toString('base64')}`,
            GIT_TERMINAL_PROMPT: '0'
        };
    }

    protected async getAuthenticatedRepository(userId: number, noProtocolURL: string) {
        const [host] = noProtocolURL.split('/');

        if (!host) throw new BadRequestError('Missing Git repository host');

        const platform = this.getPlatformByHost(host);
        const credential = await this.credentialStore.findOneBy({
            platform,
            user: { id: userId }
        });

        if (!credential?.accessToken)
            throw new NotFoundError(`${platform} OAuth credential is not found`);

        if (!credential.userName)
            throw new NotFoundError(
                `${platform} OAuth credential is missing userName; please sign in again`
            );

        return {
            repositoryURL: `https://${noProtocolURL}`,
            env: this.getGitAuthenticationEnv(host, credential.userName, credential.accessToken)
        };
    }

    protected async getDefaultBranch(GitURL: string, options: ExecFileOptions) {
        const { stdout } = await this.runCommand(
            'git',
            ['ls-remote', '--symref', GitURL, 'HEAD'],
            options
        );
        const matched = stdout.match(/ref:\s+refs\/heads\/([^\s]+)\s+HEAD/);

        if (!matched) throw new BadRequestError('Failed to detect default Git branch');

        return matched[1];
    }

    protected resolveRepositoryPath(repositoryFolder: string, fieldname: string) {
        if (!fieldname) throw new BadRequestError('Uploaded file path is required');

        const normalized = fieldname.replace(/\\/g, '/').replace(/^\/+/, '');
        const segments = normalized.split('/').filter(Boolean);

        if (segments.some(segment => segment.toLowerCase() === '.git'))
            throw new BadRequestError(`Invalid repository path: ${fieldname}`);

        const targetPath = resolve(repositoryFolder, normalized);
        const outside = relative(repositoryFolder, targetPath);

        if (outside.startsWith('..') || outside.includes(`..${sep}`) || outside === '')
            throw new BadRequestError(`Invalid repository path: ${fieldname}`);

        return targetPath;
    }

    protected async copyIncomingFile(
        repositoryFolder: string,
        { fieldname, path }: IncomingGitFile
    ) {
        const targetPath = this.resolveRepositoryPath(repositoryFolder, fieldname);

        await mkdir(dirname(targetPath), { recursive: true });
        await copyFile(path, targetPath);
    }

    async uploadFilesToRepository(
        userId: number,
        noProtocolURL: string,
        files: IncomingGitFile[]
    ): Promise<GitUploadResult> {
        if (!files.length) throw new BadRequestError('No file uploaded');

        const { repositoryURL, env } = await this.getAuthenticatedRepository(userId, noProtocolURL);
        const commandOptions = { env: { ...process.env, ...env } };
        const branch = await this.getDefaultBranch(repositoryURL, commandOptions);
        const workspace = await mkdtemp(resolve(this.tempRoot, 'hop-git-file-'));
        const repositoryFolder = resolve(workspace, 'repository');

        await mkdir(repositoryFolder, { recursive: true });

        try {
            await this.runCommand(
                process.execPath,
                [this.gitUtilityCLI, 'download', repositoryURL, branch, '', repositoryFolder],
                commandOptions
            );

            for (const file of files) await this.copyIncomingFile(repositoryFolder, file);

            await this.runCommand(
                process.execPath,
                [this.gitUtilityCLI, 'upload', repositoryFolder, repositoryURL, branch],
                commandOptions
            );

            return { repositoryUrl: repositoryURL, branch, fileCount: files.length };
        } finally {
            await rm(workspace, { recursive: true, force: true });
        }
    }
}

export const gitFileService = new GitFileService();
