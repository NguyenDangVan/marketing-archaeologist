// node:sqlite is stable enough for our use but still flagged experimental on Node 22; hide only that warning.
const defaultListeners = process.listeners("warning");
process.removeAllListeners("warning");
process.on("warning", (warning) => {
  if (warning.name === "ExperimentalWarning" && /SQLite/i.test(warning.message)) return;
  for (const listener of defaultListeners) listener(warning);
});
