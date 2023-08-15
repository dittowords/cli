const Sentry = require("@sentry/node");
Sentry.init({
  dsn: "https://9c1d99fa4267f54c6b914f720b4ed3a2@o979374.ingest.sentry.io/4505705213919232",
  debug: true,
});
Sentry.captureException(new Error("test exception 6"));
