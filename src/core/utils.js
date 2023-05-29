import { getEventHash } from "https://esm.sh/nostr-tools@1.11.1";
import { hexToBytes } from "https://esm.sh/@noble/hashes@1.3.0/utils.mjs";

let currentTime = 0;
let currentCount = 0;

/**
 * Generates a unique ID
 * @param {number} padding Amount of zeros to pad the count with
 * @returns {string} A unique ID
 */
export function getId(padding = 1) {
  const now = Date.now();
  if (now === currentTime) {
    currentCount++;
  } else {
    currentTime = now;
    currentCount = 0;
  }
  return `${now}${currentCount.toString().padStart(padding, "0")}`;
}

function msb(b) {
  let n = 0;
  if (b === 0) {
    return 8;
  }
  while ((b >>= 1)) {
    n++;
  }
  return 7 - n;
}

export function getLeadingZeroBits(hash) {
  let total, i, bits;
  for (i = 0, total = 0; i < hash.length; i++) {
    bits = msb(hash[i]);
    total += bits;
    if (bits !== 8) {
      break;
    }
  }
  return total;
}

export function getLeadingZeroBitsFromHex(hex) {
  return getLeadingZeroBits(hexToBytes(hex));
}

export function verifyPoW(event, minAllowedDifficulty = 0) {
  const [, , difficulty] = event.tags.find((tag) => tag[0] === "nonce") || [];
  if (!difficulty) return false;
  if (difficulty < minAllowedDifficulty) return false;
  const hash = getEventHash(event);
  const realDifficulty = getLeadingZeroBitsFromHex(hash);
  return realDifficulty >= difficulty;
}
