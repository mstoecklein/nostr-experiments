import * as NostrTools from "https://esm.sh/nostr-tools@1.11.1";

onconnect = (e) => {
  const port = e.ports[0];

  // TODO: change to a better pool implementation
  const pool = new NostrTools.SimplePool();
  const subscribers = new Map();

  function createSub(relays, filters, options) {
    const id = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("");
    const sub = pool.sub(relays, filters, options);
    subscribers.set(id, sub);
    sub.on("event", (event) => port.postMessage({ id, event }));
    sub.on("eose", () => port.postMessage({ id, eose: true }));
  }

  port.addEventListener("message", ({ data }) => {
    console.log("pool_worker.js", data);
    try {
      const { relays, type, params } = data;

      switch (type.toLowerCase()) {
        case "req": {
          const { filters, options } = params;
          createSub(relays, filters, { verb: "REQ", ...options });
          break;
        }
        case "count": {
          const { filters, options } = params;
          createSub(relays, filters, { verb: "COUNT", ...options });
          break;
        }
        case "unsub": {
          const { id } = params;
          const sub = subscribers.get(id);
          if (sub) {
            sub.unsub();
            subscribers.delete(id);
          }
          port.postMessage({ id, unsub: true });
          break;
        }
        case "pub": {
          const { event } = params;
          const pub = pool.publish(relays, event);
          pub.on("ok", (relay) => port.postMessage({ pub: true, relay }));
          pub.on("failed", (relay, reason) =>
            port.postMessage({ pub: false, relay, reason })
          );
          break;
        }
      }
    } catch (error) {
      console.error(error);
      throw error;
    }
  });

  port.start();
};
