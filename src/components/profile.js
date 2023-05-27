import {
  generatePrivateKey,
  getPublicKey,
} from "https://esm.sh/nostr-tools@1.11.1";
import { hexToBytes } from "https://esm.sh/@noble/hashes@1.3.0/utils.mjs";
import { getLeadingZeroBits } from "../PoWer.js";
import * as pooljob from "../pooljob.js";
import * as powerjob from "../powerjob.js";

export default function () {
  Alpine.data("profile", () => ({
    privateKey: null,
    publicKey: null,
    me: null,

    init() {
      this.privateKey = localStorage.privateKey;
      if (!this.privateKey) {
        this.privateKey = localStorage.privateKey = generatePrivateKey();
      }
      this.publicKey = getPublicKey(this.privateKey);

      pooljob.listen(({ id, type, event }) => {
        console.log("pool", id, type, event);
        if (type === "event" && event.kind === 0) {
          this.me = {
            event,
            pow: getLeadingZeroBits(hexToBytes(event.id)),
            content: event.content.startsWith("{")
              ? JSON.parse(event.content)
              : event.content,
          };
        }
      });

      this.$watch("privateKey", (value) => {
        const isSet = this.setPrivateKey(value);
        if (isSet) {
          pooljob.req([
            {
              kinds: [0],
              authors: [this.publicKey],
            },
          ]);
        }
      });
    },

    mining() {
      if (this.me) {
        console.log("running PoW for event", this.me);

        const event = {
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
        };

        powerjob.mining(this.privateKey, event, this.me.pow).then(pooljob.pub);
      }
    },
  }));
}
