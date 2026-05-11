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
});
