import { getPublicKey } from "https://esm.sh/nostr-tools@1.11.1";
import { getLeadingZeroBitsFromHex } from "../PoWer.js";
import * as pooljob from "../pooljob.js";
import * as powerjob from "../powerjob.js";
import { getReadableRelays, getWritableRelays } from "../core/relays.js";

export default function () {
  Alpine.data("profile", () => ({
    privateKey: null,
    publicKey: null,
    me: null,

    init() {
      pooljob.listen(({ id, type, event }) => {
        if (type === "event" && event.kind === 0) {
          console.log("metadata", id, type, event);
          const pow = getLeadingZeroBitsFromHex(event.id);
          this.me = {
            event,
            minedEvent: pow > 8 ? event : null,
            pow,
            content: event.content.startsWith("{")
              ? JSON.parse(event.content)
              : event.content,
          };
        }
      });

      this.$watch("privateKey", (value) => {
        this._load(value);
        if (this.privateKey) {
          pooljob.req([{ kinds: [0], authors: [this.publicKey] }], {
            relays: getReadableRelays(),
          });
        }
      });
      this._load(localStorage.privateKey);
    },

    _load(value) {
      if (!value) {
        this.privateKey = null;
        this.publicKey = null;
        this.me = null;
        localStorage.removeItem("privateKey");
        return;
      }
      this.privateKey = localStorage.privateKey = value;
      this.publicKey = getPublicKey(this.privateKey);
    },

    _mining() {
      return powerjob.mining(
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
          tags: this.me.event.tags,
          created_at: Math.round(Date.now() / 1000),
        },
        this.me.pow
      );
    },

    mining() {
      if (this.me) {
        console.log("mining metadata event", this.me);
        this._mining()
          .then((event) => {
            this.me.minedEvent = event;
          })
          .catch((err) => {
            console.error(err);
            this.me.minedEvent = null;
          });
      }
    },

    miningAndPublish() {
      if (
        this.me &&
        confirm("Are you sure you want to publish this event after mining?")
      ) {
        console.log("mining and publish metadata event", this.me);
        this._mining()
          .then((event) => {
            pooljob.pub(event, { relays: getWritableRelays() });
            this.me.minedEvent = event;
          })
          .catch((err) => {
            console.error(err);
            this.me.minedEvent = null;
          });
      }
    },
  }));
}
