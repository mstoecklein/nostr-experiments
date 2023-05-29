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
    const { nostr } = event.data;
    if (nostr) {
      console.log("REQ " + event.origin, nostr.type, nostr.data);
      requestState.input = nostr;
      requestState.mode = "request";
      requestState.origin = event.origin;
    }
  });
}
