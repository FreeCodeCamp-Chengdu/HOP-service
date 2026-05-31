import { access, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

import { FileController } from '../source/controller/File';

type FileControllerDouble = Omit<FileController, 'gitFileService'> & {
    gitFileService: {
        uploadFilesToRepository: jest.Mock;
    };
};

describe('FileController', () => {
    it('passes uploaded files to the Git file service with current user and repository URL', async () => {
        const controller = new FileController() as unknown as FileControllerDouble;

        controller.gitFileService = {
            uploadFilesToRepository: jest.fn().mockResolvedValue({
                repositoryUrl: 'https://github.com/freeCodeCamp-Chengdu/HOP-service',
                branch: 'main',
                fileCount: 2
            })
        };

        const files = [
            { fieldname: 'docs/guide.md', path: 'C:/temp/guide-upload.bin' },
            { fieldname: 'src/index.ts', path: 'C:/temp/index-upload.bin' }
        ];

        await expect(
            controller.uploadGitFiles(
                { id: 7 } as never,
                'github.com/freeCodeCamp-Chengdu/HOP-service',
                { files } as never
            )
        ).resolves.toMatchObject({
            repositoryUrl: 'https://github.com/freeCodeCamp-Chengdu/HOP-service',
            branch: 'main',
            fileCount: 2
        });

        expect(controller.gitFileService.uploadFilesToRepository).toHaveBeenCalledWith(
            7,
            'github.com/freeCodeCamp-Chengdu/HOP-service',
            files
        );
    });

    it('cleans uploaded temp files when Git upload fails', async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), 'hop-file-controller-test-'));
        const guideSource = join(tempRoot, 'guide-upload.bin');
        const codeSource = join(tempRoot, 'index-upload.bin');
        const controller = new FileController() as unknown as FileControllerDouble;

        try {
            await writeFile(guideSource, '# guide');
            await writeFile(codeSource, 'export const value = 1;\n');

            controller.gitFileService = {
                uploadFilesToRepository: jest.fn().mockRejectedValue(new Error('git push failed'))
            };

            await expect(
                controller.uploadGitFiles(
                    { id: 7 } as never,
                    'github.com/freeCodeCamp-Chengdu/HOP-service',
                    {
                        files: [
                            { fieldname: 'docs/guide.md', path: guideSource },
                            { fieldname: 'src/index.ts', path: codeSource }
                        ]
                    } as never
                )
            ).rejects.toThrow('git push failed');

            await expect(access(guideSource)).rejects.toThrow();
            await expect(access(codeSource)).rejects.toThrow();
        } finally {
            await rm(tempRoot, { recursive: true, force: true });
        }
    });

    it('rejects empty Git uploads before calling the service', async () => {
        const controller = new FileController() as unknown as FileControllerDouble;

        controller.gitFileService = {
            uploadFilesToRepository: jest.fn()
        };

        await expect(
            controller.uploadGitFiles(
                { id: 7 } as never,
                'github.com/freeCodeCamp-Chengdu/HOP-service',
                { files: [] } as never
            )
        ).rejects.toThrow('No file uploaded');

        expect(controller.gitFileService.uploadFilesToRepository).not.toHaveBeenCalled();
    });
});
