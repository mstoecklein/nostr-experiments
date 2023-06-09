import {
  getPublicKey,
  generatePrivateKey,
} from "https://esm.sh/nostr-tools@1.11.1";
import { getReadableRelays, getWritableRelays } from "../core/relays.js";
import { getLeadingZeroBitsFromHex } from "../core/utils.js";
import * as pooljob from "../pooljob.js";
import * as powerjob from "../powerjob.js";
import { eventPolicy } from "../core/policies/events.js";

export default function () {
  Alpine.data("profile", () => ({
    privateKey: null,
    publicKey: null,
    me: null,

    get event() {
      return this.me?.event;
    },

    init() {
      const events = {};

      pooljob.listen(({ type, event, relay }) => {
        if (type === "event" && event.kind === 0) {
          const currentEvent = eventPolicy(event, relay, events);
          const pow = getLeadingZeroBitsFromHex(currentEvent.event.id);

          this.me = {
            event: currentEvent.event,
            relays: currentEvent.relays,
            minedEvent: pow > 8 ? event : null,
            pow,
            content: {
              name: "<unnamed>",
              about: null,
              picture: null,
              nip05: null,
              lud16: null,
              ...(event.content.startsWith("{")
                ? JSON.parse(event.content)
                : event.content),
            },
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
      const map = new Map();
      if (this.me.content.nip05) {
        map.set("nip05", this.me.content.nip05);
      }
      if (this.me.content.lud16) {
        map.set("lud16", this.me.content.lud16);
      }
      if (this.me.content.about) {
        map.set("about", this.me.content.about);
      }
      if (this.me.content.picture) {
        map.set("picture", this.me.content.picture);
      }
      map.set("name", this.me.content.name || "<unnamed>");

      return powerjob.mining(
        this.privateKey,
        {
          kind: 0,
          pubkey: this.publicKey,
          content: JSON.stringify(Object.fromEntries(map.entries())),
          tags: this.event.tags,
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

    publish() {
      pooljob.pub(this.me.minedEvent, { relays: getWritableRelays() });
    },

    onGenerate() {
      this.privateKey = generatePrivateKey();
      this.publicKey = getPublicKey(this.privateKey);
      this.onFill();
    },

    onFill() {
      if (!this.privateKey) {
        return;
      }
      const content = {
        name: "<unnamed>",
        lud16: null,
        nip05: null,
        about: null,
        picture: null,
      };
      this.me = {
        event: {
          kind: 0,
          pubkey: this.publicKey,
          content: JSON.stringify(content),
          tags: [],
        },
        content,
        pow: 12,
        relays: getWritableRelays(),
      };
    },
  }));
}
