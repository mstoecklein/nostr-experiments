import * as NostrTools from "https://esm.sh/nostr-tools@1.11.1";

localStorage.relays = JSON.stringify([
  "https://relay.xplive.local:7443",
  "https://relay2.xplive.local:7443",
]);

globalThis.addEventListener("message", (event) => {
  const { nostr: input } = event.data;
  const privateKey = localStorage.privateKey;
  if (input) {
    console.log("nostr event", event.data);

    // non-blocking
    queueMicrotask(async () => {
      try {
        const output = { nostr: { id: input.id } };
        switch (input.type) {
          case "getPublicKey": {
            output.nostr.data = NostrTools.getPublicKey(privateKey);
            break;
          }
          case "signEvent": {
            const { event } = input.data;
            output.nostr.data = NostrTools.signEvent(event, privateKey);
            break;
          }
          case "getRelays": {
            output.nostr.data = JSON.parse(localStorage.relays);
            break;
          }
          case "nip04.encrypt": {
            const { pubkey, plaintext } = input.data;
            output.nostr.data = await NostrTools.nip04.encrypt(
              privateKey,
              pubkey,
              plaintext
            );
            break;
          }
          case "nip04.decrypt": {
            const { pubkey, ciphertext } = input.data;
            output.nostr.data = await NostrTools.nip04.decrypt(
              privateKey,
              pubkey,
              ciphertext
            );
            break;
          }
        }

        event.source.postMessage(output, event.origin);
      } catch (error) {
        console.error(error);
        output.nostr.error = error.message;
        event.source.postMessage(output, event.origin);
      }
    });
  }
});
