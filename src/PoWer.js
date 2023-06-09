import {
  finishEvent,
  utils,
  getPublicKey,
} from "https://esm.sh/nostr-tools@1.11.1";
import { schnorr } from "https://esm.sh/@noble/curves@1.0.0/secp256k1.mjs";
import { sha256 } from "https://esm.sh/@noble/hashes@1.3.0/sha256.mjs";
import { bytesToHex } from "https://esm.sh/@noble/hashes@1.3.0/utils.mjs";
import { getLeadingZeroBits } from "./core/utils.js";

export function power(privateKey, event, difficulty = 0) {
  console.log("mining", privateKey, event, difficulty);
  if (+difficulty === 0) {
    event.created_at = Math.round(Date.now() / 1000);
    const nonceIdx = event.tags.findIndex((tag) => tag[0] === "nonce");
    if (nonceIdx !== -1) {
      event.tags.splice(nonceIdx, 1);
    }
    return finishEvent(event, privateKey);
  }

  if (!event.pubkey) {
    event.pubkey = getPublicKey(privateKey);
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
    nonceTag[2] = difficulty.toString();
  } else {
    nonceTag = ["nonce", "0", difficulty.toString()];
    event.tags.push(nonceTag);
  }

  let trials = Math.round(Math.random() * 1000000);
  let hashBuffer;
  do {
    trials++;
    eventArray[2] = Math.round(Date.now() / 1000);
    nonceTag[1] = trials.toString();

    const serializedEvent = JSON.stringify(eventArray);
    const buffer = utils.utf8Encoder.encode(serializedEvent);
    hashBuffer = sha256(buffer);
  } while (getLeadingZeroBits(hashBuffer) !== difficulty);

  event.created_at = eventArray[2];
  event.id = bytesToHex(hashBuffer);
  event.sig = bytesToHex(schnorr.sign(event.id, privateKey));
  return event;
}
