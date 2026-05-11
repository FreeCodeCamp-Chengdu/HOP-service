import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

import { OAuthPlatform } from '../source/model';
import { GitFileService } from '../source/service/GitFile';

describe('GitFileService', () => {
    it('uploads incoming files into the repository root using the matching OAuth credential', async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), 'hop-git-file-test-'));
        const incomingRoot = join(tempRoot, 'incoming');

        await mkdir(incomingRoot, { recursive: true });

        const guideSource = join(incomingRoot, 'guide-upload.bin');
        const codeSource = join(incomingRoot, 'index-upload.bin');

        await writeFile(guideSource, '# guide');
        await writeFile(codeSource, 'export const value = 1;\n');

        const commands: { command: string; args: string[] }[] = [];

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
                commands.push({ command, args });

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

                    await expect(readFile(join(sourceFolder, 'README.md'), 'utf8')).resolves.toBe(
                        'existing file\n'
                    );
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
                    'https://alice:secret-token@github.com/freeCodeCamp-Chengdu/HOP-service',
                    'HEAD'
                ]
            },
            {
                command: process.execPath,
                args: [
                    expect.stringContaining('git-utility'),
                    'download',
                    'https://alice:secret-token@github.com/freeCodeCamp-Chengdu/HOP-service',
                    'main',
                    undefined as never,
                    expect.stringContaining('repository')
                ] as string[]
            },
            {
                command: process.execPath,
                args: [
                    expect.stringContaining('git-utility'),
                    'upload',
                    expect.stringContaining('repository'),
                    'https://alice:secret-token@github.com/freeCodeCamp-Chengdu/HOP-service',
                    'main'
                ] as string[]
            }
        ]);

        await rm(tempRoot, { recursive: true, force: true });
    });
});
