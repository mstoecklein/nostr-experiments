if (!("nostr" in globalThis)) {
  const requests = new Map();
  let settings;

  const setNostrSettings = function (overwriteSettings = {}) {
    localStorage.nostrSettings = JSON.stringify(overwriteSettings);
    settings = getNostrSettings();
  };

  const getNostrSettings = function (defaults = {}) {
    return JSON.parse(localStorage.nostrSettings || JSON.stringify(defaults));
  };

  const sendRequest = function (type, data = {}) {
    return new Promise((resolve, reject) => {
      const id = Date.now() * 1e4 + Math.round(Math.random() * 1e4);

      console.log("sendRequest", { id, type, data }, settings);

      // open popup
      const popup = globalThis.open(settings.targetUrl, "_blank");
      if (!popup) return reject(new Error("Failed to open popup"));

      // send request
      popup.addEventListener("load", () => {
        console.log("load", { id, type, data });
        popup.postMessage(
          { nostr: { id, type, data, timeout: settings.requestTimeout } },
          "*"
        );

        const timeout = setTimeout(
          () => reject(new Error("Request timed out")),
          settings.requestTimeout
        );

        requests.set(id, { resolve, reject, timeout });
      });
    });
  };

  settings = getNostrSettings({
    targetUrl: location.href,
    origin: location.origin,
    requestTimeout: 60000,
  });

  globalThis.addEventListener("message", (event) => {
    console.log("message", event.data);
    if ("nostr" in event.data && settings.origin === event.origin) {
      const { nostr } = event.data;
      const request = requests.get(nostr.id);
      if (!request) return;
      try {
        request.resolve(nostr.data);
      } catch (error) {
        request.reject(error);
      }
      clearTimeout(request.timeout);
      requests.delete(nostr.id);
    }
  });

  globalThis.nostr = {
    /**
     * @param {string | URL} url
     */
    set targetUrl(url) {
      const targetUrl = new URL(url);
      settings.origin = targetUrl.origin;
      settings.targetUrl = targetUrl.href;
      setNostrSettings(settings);
    },

    getPublicKey() {
      return sendRequest("getPublicKey");
    },

    signEvent(event) {
      return sendRequest("signEvent", { event });
    },

    getRelays() {
      return sendRequest("getRelays");
    },

    nip04: {
      encrypt(pubkey, plaintext) {
        return sendRequest("nip04.encrypt", { pubkey, plaintext });
      },
      decrypt(pubkey, ciphertext) {
        return sendRequest("nip04.decrypt", { pubkey, ciphertext });
      },
    },
  };
}

// customElements.define("nostr-iframe", class extends HTMLElement {});
