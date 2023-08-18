const dotenv = require("dotenv");
dotenv.config();

module.exports = {
  esbuild: {
    platform: "node",
    packages: "external",
    define: {
      "process.env.ENV": `"${process.env.ENV || "production"}"`,
      "process.env.SENTRY_DSN": `"${process.env.SENTRY_DSN}"`,
    },
  },
};
