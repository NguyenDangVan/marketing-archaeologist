#!/usr/bin/env node
// Must stay the first import: it silences node:sqlite's ExperimentalWarning before the store loads.
import "./quiet-warnings.js";
import { CommanderError } from "commander";
import { buildProgram, type Io } from "./program.js";

const io: Io = { out: (l) => console.log(l), err: (l) => console.error(l), exitCode: 0 };

try {
  buildProgram(io).parse(process.argv);
} catch (err) {
  if (!(err instanceof CommanderError)) throw err;
  io.exitCode = err.exitCode;
}
process.exitCode = io.exitCode;
