const callbacks = new Set();
const poolWorker = new SharedWorker("./pool_worker.js", {
  type: "module",
  name: "pool-worker",
  credentials: "same-origin",
});
poolWorker.port.start();

poolWorker.port.addEventListener("message", ({ data }) => {
  for (const callback of callbacks) {
    try {
      callback(data);
    } catch (error) {
      console.error(error);
    }
  }
});

export function listen(callback) {
  callbacks.add(callback);
}

export function req(filters, { relays, id, verb, skipVerification } = {}) {
  if (!relays || !relays.length) {
    throw new Error("Can't request without relays!");
  }
  poolWorker.port.postMessage({
    type: "req",
    relays: [...new Set([...relays])],
    params: { filters, options: { id, verb, skipVerification } },
  });
}

export function count(filters, { relays, id, verb, skipVerification } = {}) {
  if (!relays || !relays.length) {
    throw new Error("Can't count without relays!");
  }
  poolWorker.port.postMessage({
    type: "count",
    relays: [...new Set([...relays])],
    params: { filters, options: { id, verb, skipVerification } },
  });
}

export function unsub(id) {
  poolWorker.port.postMessage({
    type: "unsub",
    params: { id },
  });
}

export function pub(event, { relays } = {}) {
  if (!relays || !relays.length) {
    throw new Error("Can't publish without relays!");
  }
  poolWorker.port.postMessage({
    type: "pub",
    relays: [...new Set([...relays])],
    params: { event: JSON.parse(JSON.stringify(event)) },
  });
}
