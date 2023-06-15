import { Pool } from "./core/pool.js";
import { getId } from "./core/utils.js";

onconnect = (e) => {
  const port = e.ports[0];

  // TODO: change to a better pool implementation
  const pool = new Pool();
  const subscribers = new Map();

  function createSub(relays, filters, options) {
    const id = options.id ?? getId(4);
    const sub = pool.sub(relays, filters, options);
    subscribers.set(id, sub);
    sub.on("event", (event, relay) => {
      // if (event.kind === 0) {
      //   console.log(event, relay);
      // }
      port.postMessage({ id, type: "event", event, relay });
    });
    sub.on("eose", (relay) => port.postMessage({ id, type: "eose", relay }));
  }

  port.addEventListener("message", ({ data }) => {
    // console.log("pool_worker.js", data);
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
          port.postMessage({ id, type: "unsub" });
          break;
        }
        case "pub": {
          const { event } = params;
          const pub = pool.publish(relays, event);
          pub.on("ok", (relay, ...args) =>
            port.postMessage({ type: "pub", ok: true, relay, args })
          );
          pub.on("failed", (relay, reason, ...args) =>
            port.postMessage({ type: "pub", ok: false, relay, reason, args })
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
