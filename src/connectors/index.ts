import type { Channel } from "../domain/channels.js";
import type { Connector } from "./types.js";

// Connectors register here as they are built (PRD §11 R2). A channel without a connector
// is still usable through manual import (`marc import`).
export const CONNECTORS: Partial<Record<Channel, Connector>> = {};

export const connectorFor = (channel: Channel): Connector | undefined => CONNECTORS[channel];
