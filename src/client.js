export function initClient() {
  if (!("nostr" in globalThis)) {
    const requests = new Map();

    const setNostrSettings = function (overwriteSettings = {}) {
      localStorage.nostrSettings = JSON.stringify(overwriteSettings);
      settings = getNostrSettings();
    };

    const getNostrSettings = function (defaults = {}) {
      return JSON.parse(localStorage.nostrSettings || JSON.stringify(defaults));
    };

    const getId = () =>
      BigInt(Date.now()) * 10000n + BigInt(Math.round(Math.random() * 10000));

    const sendRequest = function (type, data = {}) {
      return new Promise((resolve, reject) => {
        const id = getId();

        // open popup
        const popup = globalThis.open(settings.targetUrl, "_blank");
        if (!popup) return reject(new Error("Failed to open popup"));

        // send request
        popup.addEventListener("load", () => {
          const reqTimout = settings.requestTimeout;
          const timeout = setTimeout(
            () => reject(new Error("Request timed out")),
            reqTimout
          );

          requests.set(id, { resolve, reject, timeout });
          popup.postMessage(
            { nostr: { id, type, data, timeout: reqTimout } },
            "*"
          );
        });
      });
    };

    let settings = getNostrSettings({
      targetUrl: location.href,
      origin: location.origin,
      requestTimeout: 60000,
    });

    globalThis.addEventListener("message", (event) => {
      console.log(event.data);

      const isNostrObject =
        "object" === typeof event.data &&
        null !== event.data &&
        "nostr" in event.data;

      if (isNostrObject && settings.origin === event.origin) {
        const { nostr } = event.data;
        const request = requests.get(nostr.id);
        if (!request) return;

        if (nostr.error) {
          request.reject(new Error(nostr.error));
        } else {
          try {
            request.resolve(nostr.data);
          } catch (error) {
            request.reject(error);
          }
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
        event = JSON.parse(JSON.stringify(event));
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

      nip26: {
        createDelegation(pubkey, { kind, until, since }) {
          return sendRequest("nip26.createDelegation", {
            pubkey,
            kind,
            until,
            since,
          });
        },
      },
    };
  }
}

export default initClient;
// customElements.define("nostr-iframe", class extends HTMLElement {});
