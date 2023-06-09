function sanitizeUrl(url) {
  const urlObj = new URL(url);
  if (!urlObj.protocol.match(/^(https?|wss?):$/)) {
    throw new Error("Invalid protocol");
  }
  if (!urlObj.hostname.match(/^[a-z0-9.-]+$/)) {
    throw new Error("Invalid hostname");
  }
  // check for https? protocol
  if (/^https?:$/.test(urlObj.protocol)) {
    // change to wss? protocol
    urlObj.protocol = urlObj.protocol
      .replace(/^http/, "ws")
      .replace(/^https?/, "wss");
  }
  return urlObj.toString();
}

export default function () {
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
}
