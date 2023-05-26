import { getReadableRelays, getWritableRelays } from "./core/relays.js";

const poolWorker = new SharedWorker("./pool_worker.js", {
  type: "module",
  name: "pool-worker",
  credentials: "same-origin",
});
poolWorker.port.start();

export function req(filters, options) {
  poolWorker.port.postMessage({
    type: "req",
    relays: getReadableRelays(),
    params: { filters, options },
  });
}

export function count(filters, options) {
  poolWorker.port.postMessage({
    type: "count",
    relays: getReadableRelays(),
    params: { filters, options },
  });
}

export function unsub(id) {
  poolWorker.port.postMessage({
    type: "unsub",
    relays: getReadableRelays(),
    params: { id },
  });
}

export function pub(event) {
  poolWorker.port.postMessage({
    type: "pub",
    relays: getWritableRelays(),
    params: { event: JSON.parse(JSON.stringify(event)) },
  });
}

export function listen(callback) {
  return poolWorker.port.addEventListener("message", ({ data }) => {
    try {
      const { id, event, eose, unsub, pub, relay, reason } = data;
      if (id) {
        if (event) {
          callback({ id, type: "event", event });
        } else if (eose) {
          callback({ id, type: "eose" });
        } else if (unsub) {
          callback({ id, type: "unsub" });
        }
      } else if (typeof pub === "boolean") {
        callback({ type: "pub", status: pub, relay, reason });
      }
    } catch (error) {
      console.error(error);
      throw error;
    }
  });
}
