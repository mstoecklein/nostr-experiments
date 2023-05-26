import * as NostrTools from "https://esm.sh/nostr-tools@1.11.1";
import * as sr from "https://unpkg.com/selection-ranges@3.0.3/dist/index.esm.js";
import { getLeadingZeroBits } from "./PoWer.js";
import { hexToBytes } from "https://esm.sh/@noble/hashes@1.3.0/utils.mjs";

const pool = new NostrTools.SimplePool();

function getReadableRelays() {
  return Object.entries(JSON.parse(localStorage.relays || "{}"))
    .filter(([_, { read }]) => read)
    .map(([url]) => url);
}

function getWritableRelays() {
  return Object.entries(JSON.parse(localStorage.relays || "{}"))
    .filter(([_, { write }]) => write)
    .map(([url]) => url);
}

function executeMiner(privateKey, event, difficulty) {
  return new Promise((resolve, reject) => {
    const worker = new Worker("./power_worker.js", { type: "module" });

    console.time(`executeMiner(difficulty=${difficulty})`);
    worker.addEventListener(
      "message",
      (event) => {
        console.timeEnd(`executeMiner(difficulty=${difficulty})`);
        console.log("executeMiner", event.data);
        resolve(event.data);
      },
      { once: true }
    );

    worker.addEventListener("error", (event) => reject(event.error), {
      once: true,
    });

    worker.postMessage({ privateKey, event, difficulty });
  });
}

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

globalThis.addEventListener("alpine:init", () => {
  Alpine.data("nip19", () => ({
    obfuscate: false,
    inputValue: null,
    outputValue: null,

    toggleObfuscate() {
      this.obfuscate = !this.obfuscate;
    },

    genNSEC() {
      try {
        if (this.inputValue?.length > 0) {
          this.outputValue = NostrTools.nip19.nsecEncode(this.inputValue);
        } else {
          this.outputValue = null;
        }
        this.obfuscate = true;
      } catch {
        // ignore
      }
    },

    genNPUB() {
      try {
        if (this.inputValue?.length > 0) {
          this.outputValue = NostrTools.nip19.npubEncode(this.inputValue);
        } else {
          this.outputValue = null;
        }
        this.obfuscate = false;
      } catch {
        // ignore
      }
    },

    render(altText = "") {
      const obfuscate = this.obfuscate;
      if (this.outputValue) {
        const [, prefix, data] = this.outputValue.match(
          /^(nprofile|nrelay|nevent|naddr|nsec|npub|note)?(.+)$/
        );
        if (prefix) {
          return /*html*/ `<b>${prefix}</b>${
            obfuscate ? "****************" : data
          }`;
        }
        return data;
      }
      return altText;
    },

    extractNSEC(input) {
      if (!input) return false;
      try {
        const { type, data } = NostrTools.nip19.decode(input);
        if (type === "nsec") {
          this.inputValue = data;
          this.outputValue = input;
          return true;
        }
      } catch {
        // ignore
      }
      return false;
    },

    extractNPUB(input) {
      if (!input) return false;
      try {
        const { type, data } = NostrTools.nip19.decode(input);
        if (type === "npub") {
          this.inputValue = data;
          this.outputValue = input;
          return true;
        }
      } catch {
        // ignore
      }
      return false;
    },

    onClick() {
      const input = this.$el;
      const { length: end } = input.textContent || "";
      if (end > 0) {
        sr.setRange(input, { start: 0, end });
      }
    },

    onBackspace() {
      this.inputValue = null;
      this.outputValue = null;
    },

    async onPasteNSEC() {
      const input = await navigator.clipboard.readText();
      const isNsec = this.extractNSEC(input);
      if (!isNsec) {
        this.inputValue = input;
        this.genNSEC();
      }
      this.obfuscate = true;
    },

    async onPasteNPUB() {
      const input = await navigator.clipboard.readText();
      const isNpub = this.extractNPUB(input);
      if (!isNpub) {
        this.inputValue = input;
        this.genNPUB();
      }
      this.obfuscate = false;
    },

    onContenteditableInput() {
      const input = this.$el;
      const text = (input.textContent || "").trim();
      const offset = sr.getRange(input);
      const [, prefix, data] =
        text.match(/^(nprofile|nrelay|nevent|naddr|nsec|npub|note)?(.*)$/) ||
        [];
      input.textContent = "";

      // validation of NPUB and NSEC values
      const isNpubOrNsec = prefix === "npub" || prefix === "nsec";
      const isValidNpubOrNsec = isNpubOrNsec && text.length === 63;

      // allow other value formats like nprofile, nrelay, nevent, naddr, note
      // as well as valid npub and nsec values
      if (prefix && data && (!isNpubOrNsec || isValidNpubOrNsec)) {
        // render the valid value
        const b = document.createElement("b");
        b.textContent = prefix;
        input.appendChild(b);
        input.appendChild(document.createTextNode(data));
      } else if (text) {
        // render the invalid value
        const del = document.createElement("del");
        del.textContent = text;
        input.appendChild(del);
      }
      sr.setRange(input, offset);
    },
  }));

  Alpine.data("profile", () => ({
    privateKey: null,
    publicKey: null,
    me: null,

    _sub: null,

    init() {
      this.$watch("privateKey", (value) => {
        const isSet = this.setPrivateKey(value);
        if (isSet) {
          if (this._sub) this._sub.unsub();
          const sub = (this._sub = pool.sub(getReadableRelays(), [
            {
              kinds: [0],
              authors: [this.publicKey],
            },
            {
              kinds: [2, 3],
              authors: [this.publicKey],
            },
          ]));

          sub.on("event", (event) => {
            console.log("event", event);
            if (event.kind === 0) {
              this.me = {
                event,
                pow: getLeadingZeroBits(hexToBytes(event.id)),
                content: event.content.startsWith("{")
                  ? JSON.parse(event.content)
                  : event.content,
              };
            }
          });
          sub.on("count", (count) => {
            console.log("count", count);
          });
          sub.on("eose", (eose) => {
            console.log("eose", eose);
          });
        }
      });
    },

    setPrivateKey(value) {
      if (value) {
        this.privateKey = value;
        this.publicKey = NostrTools.getPublicKey(value);
        return true;
      }

      this.privateKey = null;
      this.publicKey = null;
      return false;
    },

    mining() {
      if (this.me) {
        console.log("running PoW for event", this.me);
        executeMiner(
          this.privateKey,
          {
            kind: 0,
            pubkey: this.publicKey,
            content: JSON.stringify({
              name: this.me.content.name,
              about: this.me.content.about || "",
              picture: this.me.content.picture || "",
              nip05: this.me.content.nip05 || "",
              nip05valid: Boolean(this.me.content.nip05valid),
              lud16: this.me.content.lud16 || "",
            }),
            tags: [...this.me.event.tags.map((tag) => [...tag])],
            created_at: Math.round(Date.now() / 1000),
          },
          this.me.pow
        ).then((event) => {
          console.log("PoW result", event);
          const pub = pool.publish(getWritableRelays(), event);
          pub.on("ok", (relay) => {
            console.log("ok", relay);
          });
          pub.on("failed", (failed) => {
            console.log("failed", failed);
          });
        });
      }
    },
  }));

  Alpine.data("relays", () => ({
    relays: new Map(),

    init() {
      this.load();
    },

    load() {
      this.relays = new Map(
        Object.entries(JSON.parse(localStorage.relays || "{}"))
      );
    },

    validate(input, relay) {
      input.setCustomValidity("");

      // check for pattern mismatch
      if (input.validity.patternMismatch) {
        try {
          relay.url = sanitizeUrl(input.value);
        } catch {
          // add a custom message to the validity object
          input.setCustomValidity("Please enter a valid domain or URL.");
          input.reportValidity();
          return false;
        }
      }

      return true;
    },

    save(relay, input, reset = false) {
      try {
        if (!this.validate(input, relay)) {
          return;
        }

        this.relays.set(relay.url, { read: relay.read, write: relay.write });
        localStorage.relays = JSON.stringify(Object.fromEntries(this.relays));
      } catch (err) {
        console.error(err);
      }

      if (reset) {
        input.value = "";
      }
    },

    remove(relay) {
      const url = relay.url;
      if (url) {
        try {
          this.relays.delete(url);
          localStorage.relays = JSON.stringify(Object.fromEntries(this.relays));
        } catch (err) {
          console.error(err);
        }
      }
    },

    reset() {
      this.$refs.addrelay.value = "";
    },
  }));
});
