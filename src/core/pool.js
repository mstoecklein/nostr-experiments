import { relayInit, utils } from "https://esm.sh/nostr-tools@1.11.1";

export class Pool {
  _conn = new Map();
  _seenOn = {};

  /**
   * Policies to be applied to all relays
   */
  _policies = null;
  eoseSubTimeout = 3400;
  getTimeout = 3400;

  constructor({ eoseSubTimeout, getTimeout, policies } = {}) {
    this.eoseSubTimeout = eoseSubTimeout || 3400;
    this.getTimeout = getTimeout || 3400;
    this._policies = new Set(policies || []);
  }

  close(relays) {
    relays.forEach((url) => {
      const relay = this._conn[utils.normalizeURL(url)];
      if (relay) relay.close();
    });
  }

  async ensureRelay(url) {
    const nm = utils.normalizeURL(url);

    if (!this._conn.get(nm)) {
      this._conn.set(
        nm,
        relayInit(nm, {
          getTimeout: this.getTimeout * 0.9,
          listTimeout: this.getTimeout * 0.9,
        })
      );
    }

    const relay = this._conn.get(nm);
    await relay.connect();
    return relay;
  }

  sub(relays, filters, opts = {}) {
    const knownIds = new Set();
    const modifiedOpts = { ...opts };
    modifiedOpts.alreadyHaveEvent = (id, url) => {
      if (opts?.alreadyHaveEvent?.(id, url)) {
        return true;
      }
      const set = this._seenOn[id] || new Set();
      set.add(url);
      this._seenOn[id] = set;
      return knownIds.has(id);
    };

    const subs = [];
    const eventListeners = new Set();
    const eoseListeners = new Set();
    let eosesMissing = relays.length;

    let eoseSent = false;
    const eoseTimeout = setTimeout(() => {
      eoseSent = true;
      for (const cb of eoseListeners.values()) cb();
    }, this.eoseSubTimeout);

    relays.forEach(async (relay) => {
      let r;
      try {
        r = await this.ensureRelay(relay);
      } catch {
        handleEose();
        return;
      }
      if (!r) return;
      const s = r.sub(filters, modifiedOpts);
      s.on("event", (event) => {
        knownIds.add(event.id);
        for (const cb of eventListeners.values()) cb(event, relay);
      });
      s.on("eose", () => {
        if (eoseSent) return;
        handleEose(relay);
      });
      subs.push(s);

      function handleEose() {
        eosesMissing--;
        if (eosesMissing === 0) {
          clearTimeout(eoseTimeout);
          for (const cb of eoseListeners.values()) cb(relay);
        }
      }
    });

    const greaterSub = {
      sub(filters, opts) {
        subs.forEach((sub) => sub.sub(filters, opts));
        return greaterSub;
      },
      unsub() {
        subs.forEach((sub) => sub.unsub());
      },
      on(type, cb) {
        if (type === "event") {
          eventListeners.add(cb);
        } else if (type === "eose") {
          eoseListeners.add(cb);
        }
      },
      off(type, cb) {
        if (type === "event") {
          eventListeners.delete(cb);
        } else if (type === "eose") eoseListeners.delete(cb);
      },
    };

    return greaterSub;
  }

  get(relays, filter, opts = {}) {
    return new Promise((resolve) => {
      const sub = this.sub(relays, [filter], opts);
      const timeout = setTimeout(() => {
        sub.unsub();
        resolve(null);
      }, this.getTimeout);
      sub.on("event", (event) => {
        resolve(event);
        clearTimeout(timeout);
        sub.unsub();
      });
    });
  }

  list(relays, filters, opts = {}) {
    return new Promise((resolve) => {
      const events = [];
      const sub = this.sub(relays, filters, opts);

      sub.on("event", (event) => {
        events.push(event);
      });

      // we can rely on an eose being emitted here because pool.sub() will fake one
      sub.on("eose", () => {
        sub.unsub();
        resolve(events);
      });
    });
  }

  publish(relays, event) {
    const pubPromises = relays.map(async (relay) => {
      let r;
      try {
        r = await this.ensureRelay(relay);
        return r.publish(event);
      } catch (_) {
        return { on() {}, off() {} };
      }
    });

    const callbackMap = new Map();

    return {
      on(type, cb) {
        relays.forEach(async (relay, i) => {
          const pub = await pubPromises[i];
          const callback = () => cb(relay);
          callbackMap.set(cb, callback);
          pub.on(type, callback);
        });
      },

      off(type, cb) {
        relays.forEach(async (_, i) => {
          const callback = callbackMap.get(cb);
          if (callback) {
            const pub = await pubPromises[i];
            pub.off(type, callback);
          }
        });
      },
    };
  }

  seenOn(id) {
    return Array.from(this._seenOn[id]?.values?.() || []);
  }
}
