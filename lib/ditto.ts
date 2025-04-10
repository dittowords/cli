#!/usr/bin/env node
// This is the main entry point for the ditto-cli command.
import * as Sentry from "@sentry/node";
import { version as release } from "../package.json";
import legacyAppEntry from "./legacy";
import appEntry from "./src";
import output from "./src/utils/output";

// Initialize Sentry
const environment = process.env.ENV || "development";
Sentry.init({ dsn: process.env.SENTRY_DSN, environment, release });

const main = async () => {
  // Check for --legacy flag and run in legacy mode if present
  if (process.argv.includes("--legacy")) {
    console.log(
      output.warnText(
        "\nDitto CLI is running in legacy mode. This mode is deprecated and will be removed in a future release.\n"
      )
    );
    legacyAppEntry();
  } else {
    // Run in Beta mode
    appEntry();
  }
};

main();
