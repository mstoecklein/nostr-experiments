import { power } from "./PoWer.js";

globalThis.onmessage = function ({ data }) {
  try {
    const { privateKey, event, difficulty } = data;
    const minedEvent = power(privateKey, event, Number(difficulty));
    globalThis.postMessage(minedEvent);
  } catch (error) {
    console.error(error);
    throw error;
  }
};
