import { verifyPoW } from "../utils.js";

/**
 * PoW check. It checks if the ID fits the difficulty and if the ID
 * fits the nonce criteria.
 * @param {*[]} events list of events to check
 * @param {number} minDifficulty minimum difficulty value based on bits
 * @returns {*[]} list of events that pass the PoW check
 */
export function powPolicy(events, minDifficulty = 0) {
  const validEvents = [];
  for (const event of events) {
    if (verifyPoW(event, minDifficulty)) {
      validEvents.push(event);
    }
  }
  return validEvents;
}
