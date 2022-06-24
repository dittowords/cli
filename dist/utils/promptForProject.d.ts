export = promptForProject;
declare function promptForProject({ message, projects, limit }: {
    message: any;
    projects: any;
    limit?: number | undefined;
}): Promise<{
    name: any;
    id: any;
} | null>;
