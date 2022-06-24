/**
 * @param {{ meta: Object.<string, string> }} options
 */
export function pull(options: {
    meta: {
        [x: string]: string;
    };
}): Promise<void>;
declare function cleanOutputFiles(): string;
/**
 * For a given variant:
 * - if format is unspecified, fetch data for all projects from `/projects` and
 * save in `{variantApiId}.json`
 * - if format is `flat` or `structured`, fetch data for each project from `/project/:project_id` and
 * save in `{projectName}-${variantApiId}.json`
 */
declare function downloadAndSaveVariant(variantApiId: any, projects: any, format: any, token: any): Promise<string>;
/**
 * @param {{ meta: Object.<string, string> }} options
 */
declare function downloadAndSaveVariants(projects: any, format: any, token: any, options: {
    meta: {
        [x: string]: string;
    };
}): Promise<string>;
/**
 @param {{ meta: Object.<string, string> }} options
 */
declare function downloadAndSaveBase(projects: any, format: any, token: any, options: {
    meta: {
        [x: string]: string;
    };
}): Promise<string>;
export declare namespace _testing {
    export { cleanOutputFiles };
    export { downloadAndSaveVariant };
    export { downloadAndSaveVariants };
    export { downloadAndSaveBase };
}
export {};
