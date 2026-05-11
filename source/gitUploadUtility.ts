import path from 'node:path';

import { UnprocessableEntityError } from 'routing-controllers';

export const MAX_ERROR_LINES = 3;
const MAX_UPLOAD_FILE_PATH_LENGTH = 512;

const hasControlCharacter = (text: string) =>
    [...text].some(character => {
        const code = character.charCodeAt(0);

        return code < 32 || code === 127;
    });

export const sanitizePathInput = (inputPath: string) => {
    if (inputPath.length > MAX_UPLOAD_FILE_PATH_LENGTH)
        throw new UnprocessableEntityError(`Invalid file path: ${inputPath}`);

    const normalizedPath = path.normalize(inputPath).replace(/^[\\/]+/g, '');

    if (
        !normalizedPath ||
        normalizedPath === '.' ||
        normalizedPath.startsWith('..') ||
        hasControlCharacter(normalizedPath) ||
        path.isAbsolute(normalizedPath)
    )
        throw new UnprocessableEntityError(`Invalid file path: ${inputPath}`);

    return normalizedPath;
};

export const resolveSafePath = (basePath: string, inputPath: string) => {
    const normalizedPath = sanitizePathInput(inputPath);
    const targetPath = path.resolve(basePath, normalizedPath);

    if (targetPath !== basePath && !targetPath.startsWith(`${basePath}${path.sep}`))
        throw new UnprocessableEntityError(`Invalid file path: ${inputPath}`);

    return targetPath;
};

export const normalizeRelativePath = (inputPath: string) => sanitizePathInput(inputPath);

export const sanitizeGitError = (message: string, accessToken: string) =>
    message
        .replaceAll(accessToken, '***')
        .replaceAll(encodeURIComponent(accessToken), '***')
        .replaceAll(encodeURIComponent(encodeURIComponent(accessToken)), '***')
        .replace(/\/\/[^/@\s]+@/g, '//***@')
        .trim();
