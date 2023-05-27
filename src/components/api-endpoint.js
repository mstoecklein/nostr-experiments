import {
  getPublicKey,
  signEvent,
  nip04,
  nip26,
} from "https://esm.sh/nostr-tools@1.11.1";

const requestState = { mode: "idle", origin: null, input: null };
let clientChannel = null;

export function getChannel() {
  return clientChannel;
}

export function getRequestState() {
  return requestState;
}

export function clearRequestState() {
  requestState.mode = "idle";
  requestState.origin = null;
  requestState.input = null;
}

export default function (channel) {
  if (!channel) return;
  clientChannel = channel;

  globalThis.addEventListener("message", (event) => {
    const { nostr: input } = event.data;
    if (input) {
      console.log("REQ " + event.origin, input.type, input.data);
      requestState.input = input;
      requestState.mode = "request";
      requestState.origin = event.origin;
      // try {
      //   const output = { nostr: { id: input.id } };
      //   switch (input.type) {
      //     case "getPublicKey": {
      //       output.nostr.data = getPublicKey(privateKey);
      //       break;
      //     }
      //     case "signEvent": {
      //       const { event } = input.data;
      //       output.nostr.data = signEvent(event, privateKey);
      //       break;
      //     }
      //     case "getRelays": {
      //       output.nostr.data = JSON.parse(localStorage.relays);
      //       break;
      //     }
      //     case "nip04.encrypt": {
      //       const { pubkey, plaintext } = input.data;
      //       output.nostr.data = await nip04.encrypt(
      //         privateKey,
      //         pubkey,
      //         plaintext
      //       );
      //       break;
      //     }
      //     case "nip04.decrypt": {
      //       const { pubkey, ciphertext } = input.data;
      //       output.nostr.data = await nip04.decrypt(
      //         privateKey,
      //         pubkey,
      //         ciphertext
      //       );
      //       break;
      //     }
      //     case "nip26.createDelegation": {
      //       const { pubkey, kind, until, since } = input.data;
      //       output.nostr.data = nip26.createDelegation(privateKey, {
      //         pubkey,
      //         kind,
      //         until,
      //         since,
      //       });
      //       break;
      //     }
      //   }

      //   channel.postMessage(output, event.origin);
      // } catch (error) {
      //   console.error(error);
      //   output.nostr.error = error.message;
      //   channel.postMessage(output, event.origin);
      // }
    }
  });
}
