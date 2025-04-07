#!/usr/bin/env node
// This is the main entry point for the ditto-cli command.
import { program } from "commander";
import { init, needsTokenOrSource } from "./init/init";
import { pull } from "./pull";
import { quit } from "./utils/quit";
import addProject from "./add-project";
import removeProject from "./remove-project";
import { replace } from "./replace";
import { generateSuggestions } from "./generate-suggestions";
import processMetaOption from "./utils/processMetaOption";
import { importComponents } from "./importComponents";
import { showComponentFolders } from "./component-folders";
import { version } from "../../package.json";

const CONFIG_FILE_RELIANT_COMMANDS = [
  "pull",
  "none",
  "project",
  "project add",
  "project remove",
];

type Command =
  | "pull"
  | "project"
  | "project add"
  | "project remove"
  | "component-folders"
  | "generate-suggestions"
  | "replace"
  | "import-components";

interface CommandConfig<T extends Command | "add" | "remove"> {
  name: T;
  description: string;
  commands?: CommandConfig<"add" | "remove">[];
  flags?: {
    [flag: string]: { description: string; processor?: (value: string) => any };
  };
}

const COMMANDS: CommandConfig<Command>[] = [
  {
    name: "pull",
    description: "Sync copy from Ditto into the current working directory",
    flags: {
      "--sample-data": {
        description: "Include sample data. Currently only supports variants.",
      },
    },
  },
  {
    name: "project",
    description: "Add a Ditto project to sync copy from",
    commands: [
      {
        name: "add",
        description: "Add a Ditto project to sync copy from",
      },
      {
        name: "remove",
        description: "Stop syncing copy from a Ditto project",
      },
    ],
  },
  {
    name: "component-folders",
    description:
      "List component folders in your workspace. More information about component folders can be found here: https://www.dittowords.com/docs/component-folders.",
    flags: {
      "-s, --sample-data": {
        description: "Includes the sample components folder in the output",
      },
    },
  },
  {
    name: "generate-suggestions",
    description: "Find text that can be potentially replaced with Ditto text",
    flags: {
      "-d, --directory [value]": {
        description: "Directory to search for text",
      },
      "-f, --files [value]": {
        description: "Files to search for text (will override -d)",
        processor: (value: string) => value.split(","),
      },
      "-cf, --component-folder [value]": {
        description: "Component folder to search for matches",
      },
    },
  },
  {
    name: "replace",
    description: "Find and replace Ditto text with code",
    flags: {
      "-ln, --line-numbers [value]": {
        description: "Only replace text on a specific line number",
        processor: (value: string) => value.split(",").map(Number),
      },
    },
  },
  {
    name: "import-components",
    description:
      "Import components via a file. For more information please see: https://www.dittowords.com/docs/importing-string-files.",
    flags: {
      "-t, --text [value]": {
        description: "Text column index (.csv format only)",
      },
      "-n, --component-name [value]": {
        description: "Name column indexes (comma separated) (.csv format only)",
      },
      "-no, --notes [value]": {
        description: "Notes column index (.csv format only)",
      },
      "-t, --tags [value]": {
        description: "Tags column index (.csv format only)",
      },
      "-s, --status [value]": {
        description: "Status column index (.csv format only)",
      },
      "-c, --component-id [value]": {
        description: "Component ID column index (.csv format only)",
      },
    },
  },
];

const setupCommands = () => {
  program.name("ditto-cli");

  COMMANDS.forEach((commandConfig) => {
    const cmd = program
      .command(commandConfig.name)
      .description(commandConfig.description)
      .action((options) => {
        return executeCommand(commandConfig.name, options);
      });

    if (commandConfig.flags) {
      Object.entries(commandConfig.flags).forEach(
        ([flags, { description, processor }]) => {
          if (processor) {
            cmd.option(flags, description, processor);
          } else {
            cmd.option(flags, description);
          }
        }
      );
    }

    if ("commands" in commandConfig && commandConfig.commands) {
      commandConfig.commands.forEach((nestedCommand) => {
        cmd
          .command(nestedCommand.name)
          .description(nestedCommand.description)
          .action((str, options) => {
            if (commandConfig.name === "project") {
              const command =
                `${commandConfig.name} ${nestedCommand.name}` as Command;

              return executeCommand(command, options);
            }
          });
      });
    }
  });
};

const setupOptions = () => {
  program.option("-l, --legacy", "Run in legacy mode");
  program.option(
    "-m, --meta <data...>",
    "Include arbitrary data in requests to the Ditto API. Ex: -m githubActionRequest:true trigger:manual"
  );
  program.version(version, "-v, --version", "Output the current version");
};

const executeCommand = async (
  command: Command | "none",
  options: any
): Promise<void> => {
  const needsInitialization =
    CONFIG_FILE_RELIANT_COMMANDS.includes(command) && needsTokenOrSource();

  if (needsInitialization) {
    try {
      await init();
    } catch (error) {
      await quit("Exiting Ditto CLI...");
      return;
    }
  }

  const { meta } = program.opts();
  switch (command) {
    case "none":
    case "pull": {
      return pull({
        meta: processMetaOption(meta),
        includeSampleData: options.sampleData || false,
      });
    }
    case "project":
    case "project add": {
      // initialization already includes the selection of a source,
      // so if `project add` is called during initialization, don't
      // prompt the user to select a source again
      if (needsInitialization) return;

      return addProject();
    }
    case "project remove": {
      return removeProject();
    }
    case "component-folders": {
      return showComponentFolders({
        showSampleData: options.sampleData,
      });
    }
    case "generate-suggestions": {
      return generateSuggestions({
        directory: options.directory,
        files: options.files,
        componentFolder: options.componentFolder,
      });
    }
    case "replace": {
      return replace(options.args, {
        ...(options?.lineNumbers ? { lineNumbers: options.lineNumbers } : {}),
      });
    }
    case "import-components": {
      if (options.args.length === 0) {
        console.info("Please provide a file path.");
        return;
      }
      return importComponents(options.args[0], {
        csvColumnMapping: {
          name: options.componentName,
          text: options.text,
          notes: options.notes,
          tags: options.tags,
          status: options.status,
          componentId: options.componentId,
        },
      });
    }
    default: {
      await quit("Exiting Ditto CLI...");
      return;
    }
  }
};

const legacyAppEntry = async () => {
  setupCommands();
  setupOptions();

  if (process.argv.length <= 2 && process.argv[1].includes("ditto-cli")) {
    await executeCommand("none", []);
    return;
  }

  program.parse(process.argv);
};

export default legacyAppEntry;
