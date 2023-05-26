import * as NostrTools from "https://esm.sh/nostr-tools@1.11.1";
import { schnorr } from "https://esm.sh/@noble/curves@1.0.0/secp256k1.mjs";
import { sha256 } from "https://esm.sh/@noble/hashes@1.3.0/sha256.mjs";
import { bytesToHex } from "https://esm.sh/@noble/hashes@1.3.0/utils.mjs";

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

export function power(privateKey, event, difficulty = 0) {
  if (difficulty === 0) {
    return NostrTools.finishEvent(event, privateKey);
  }

  const eventArray = [
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content,
  ];

  let nonceTag = event.tags.find((tag) => tag[0] === "nonce");
  if (nonceTag) {
    nonceTag[1] = "0";
    nonceTag[2] = "21";
  } else {
    nonceTag = ["nonce", "0", "21"];
    event.tags.push(nonceTag);
  }

  let trials = Math.round(Math.random() * 1000000);
  let hashBuffer;
  do {
    trials++;
    eventArray[2] = Math.round(Date.now() / 1000);
    nonceTag[1] = trials.toString();

    const serializedEvent = JSON.stringify(eventArray);
    const buffer = NostrTools.utils.utf8Encoder.encode(serializedEvent);
    hashBuffer = sha256(buffer);
  } while (getLeadingZeroBits(hashBuffer) !== difficulty);

  event.created_at = eventArray[2];
  event.id = bytesToHex(hashBuffer);
  event.sig = bytesToHex(schnorr.sign(event.id, privateKey));
  return event;
}
