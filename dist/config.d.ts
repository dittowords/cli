export function createFileIfMissing(filename: any): void;
/**
 * Read data from a file
 * @param {string} file defaults to `PROJECT_CONFIG_FILE` defined in `constants.js`
 * @param {*} defaultData defaults to `{}`
 * @returns
 */
export function readData(file?: string, defaultData?: any): any;
export function writeData(file: any, data: any): void;
export function justTheHost(host: any): any;
export function saveToken(file: any, host: any, token: any): void;
export function deleteToken(file: any, host: any): void;
export function getToken(file: any, host: any): any;
export function getTokenFromEnv(): string | undefined;
export function save(file: any, key: any, value: any): void;
/**
 * Reads from the config file, filters out
 * invalid projects, dedupes those remaining, and returns:
 * - whether or not the data required to `pull` is present
 * - whether or not the component library should be fetched
 * - an array of valid, deduped projects
 * - the `variants` and `format` config options
 */
export function parseSourceInformation(): {
    hasSourceData: number | boolean;
    validProjects: any[];
    shouldFetchComponentLibrary: boolean;
    variants: any;
    format: any;
};
