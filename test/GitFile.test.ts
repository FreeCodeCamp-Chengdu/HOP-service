import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

import { OAuthPlatform } from '../source/model';
import { GitFileService } from '../source/service/GitFile';

describe('GitFileService', () => {
    it('uploads incoming files into the repository root using the matching OAuth credential', async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), 'hop-git-file-test-'));
        const incomingRoot = join(tempRoot, 'incoming');

        try {
            await mkdir(incomingRoot, { recursive: true });

            const guideSource = join(incomingRoot, 'guide-upload.bin');
            const codeSource = join(incomingRoot, 'index-upload.bin');

            await writeFile(guideSource, '# guide');
            await writeFile(codeSource, 'export const value = 1;\n');

            const commands: { command: string; args: string[]; authHeader?: string }[] = [];

            const service = new GitFileService({
                credentialStore: {
                    findOneBy: jest.fn().mockResolvedValue({
                        platform: OAuthPlatform.GitHub,
                        userName: 'alice',
                        accessToken: 'secret-token'
                    })
                },
                tempRoot,
                runCommand: jest.fn(async (command: string, args: string[], options) => {
                    commands.push({
                        command,
                        args,
                        authHeader: options?.env?.GIT_CONFIG_VALUE_0 as string | undefined
                    });

                    if (command === 'git' && args[0] === 'ls-remote')
                        return { stdout: 'ref: refs/heads/main\tHEAD\nabc123\tHEAD\n' };

                    if (command === process.execPath && args[1] === 'download') {
                        const targetFolder = args[5];

                        await mkdir(targetFolder, { recursive: true });
                        await writeFile(join(targetFolder, 'README.md'), 'existing file\n');

                        return { stdout: '' };
                    }

                    if (command === process.execPath && args[1] === 'upload') {
                        const sourceFolder = args[2];

                        await expect(
                            readFile(join(sourceFolder, 'README.md'), 'utf8')
                        ).resolves.toBe('existing file\n');
                        await expect(
                            readFile(join(sourceFolder, 'docs', 'guide.md'), 'utf8')
                        ).resolves.toBe('# guide');
                        await expect(
                            readFile(join(sourceFolder, 'src', 'index.ts'), 'utf8')
                        ).resolves.toBe('export const value = 1;\n');

                        return { stdout: '' };
                    }

                    throw new Error(`Unexpected command: ${command} ${args.join(' ')}`);
                })
            });

            await expect(
                service.uploadFilesToRepository(7, 'github.com/freeCodeCamp-Chengdu/HOP-service', [
                    { fieldname: 'docs/guide.md', path: guideSource },
                    { fieldname: 'src/index.ts', path: codeSource }
                ])
            ).resolves.toMatchObject({
                branch: 'main',
                fileCount: 2,
                repositoryUrl: 'https://github.com/freeCodeCamp-Chengdu/HOP-service'
            });

            expect(commands).toEqual([
                {
                    command: 'git',
                    args: [
                        'ls-remote',
                        '--symref',
                        'https://github.com/freeCodeCamp-Chengdu/HOP-service',
                        'HEAD'
                    ],
                    authHeader: expect.stringMatching(/^AUTHORIZATION: Basic /)
                },
                {
                    command: process.execPath,
                    args: [
                        expect.stringContaining('git-utility'),
                        'download',
                        'https://github.com/freeCodeCamp-Chengdu/HOP-service',
                        'main',
                        '',
                        expect.stringContaining('repository')
                    ] as string[],
                    authHeader: expect.stringMatching(/^AUTHORIZATION: Basic /)
                },
                {
                    command: process.execPath,
                    args: [
                        expect.stringContaining('git-utility'),
                        'upload',
                        expect.stringContaining('repository'),
                        'https://github.com/freeCodeCamp-Chengdu/HOP-service',
                        'main'
                    ] as string[],
                    authHeader: expect.stringMatching(/^AUTHORIZATION: Basic /)
                }
            ]);

            expect(commands.flatMap(({ args }) => args)).not.toContain('secret-token');
        } finally {
            await rm(tempRoot, { recursive: true, force: true });
        }
    });

    it('rejects paths inside the Git metadata folder', async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), 'hop-git-file-test-'));
        const incomingFile = join(tempRoot, 'config-upload.bin');

        try {
            await writeFile(incomingFile, 'malicious config');

            const service = new GitFileService({
                credentialStore: {
                    findOneBy: jest.fn().mockResolvedValue({
                        platform: OAuthPlatform.GitHub,
                        userName: 'alice',
                        accessToken: 'secret-token'
                    })
                },
                tempRoot,
                runCommand: jest.fn(async (command: string, args: string[]) => {
                    if (command === 'git' && args[0] === 'ls-remote')
                        return { stdout: 'ref: refs/heads/main\tHEAD\nabc123\tHEAD\n' };

                    if (command === process.execPath && args[1] === 'download') {
                        await mkdir(args[5], { recursive: true });

                        return { stdout: '' };
                    }

                    throw new Error(`Unexpected command: ${command} ${args.join(' ')}`);
                })
            });

            await expect(
                service.uploadFilesToRepository(7, 'github.com/freeCodeCamp-Chengdu/HOP-service', [
                    { fieldname: '.git/config', path: incomingFile }
                ])
            ).rejects.toThrow('Invalid repository path');
        } finally {
            await rm(tempRoot, { recursive: true, force: true });
        }
    });
});
