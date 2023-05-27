import {
  getPublicKey,
  finishEvent,
  nip04,
  nip26,
} from "https://esm.sh/nostr-tools@1.11.1";
import {
  getChannel,
  getRequestState,
  clearRequestState,
} from "../components/api-endpoint.js";

export async function access() {
  const { mode, origin, input } = getRequestState();
  if (mode !== "request") return;

  const privateKey = localStorage.privateKey;
  const channel = getChannel();
  const nostr = { id: input.id };
  try {
    switch (input.type) {
      case "getPublicKey": {
        nostr.data = getPublicKey(privateKey);
        break;
      }
      case "signEvent": {
        const { event } = input.data;
        nostr.data = finishEvent(event, privateKey);
        break;
      }
      case "getRelays": {
        nostr.data = JSON.parse(localStorage.relays || "{}");
        break;
      }
      case "nip04.encrypt": {
        const { pubkey, plaintext } = input.data;
        nostr.data = await nip04.encrypt(privateKey, pubkey, plaintext);
        break;
      }
      case "nip04.decrypt": {
        const { pubkey, ciphertext } = input.data;
        nostr.data = await nip04.decrypt(privateKey, pubkey, ciphertext);
        break;
      }
      case "nip26.createDelegation": {
        const { pubkey, kind, until, since } = input.data;
        nostr.data = nip26.createDelegation(privateKey, {
          pubkey,
          kind,
          until,
          since,
        });
        break;
      }
    }
  } catch (error) {
    nostr.error = error.message;
  } finally {
    channel.postMessage({ nostr }, origin);
    clearRequestState();
  }
}

export function deny() {
  const { origin, input } = getRequestState();
  getChannel().postMessage(
    {
      nostr: {
        id: input.id,
        error: "Access denied",
      },
    },
    origin
  );
  clearRequestState();
}
