import { nip19 } from "https://esm.sh/nostr-tools@1.11.1";
import { getReadableRelays, getWritableRelays } from "../core/relays.js";
import { getLeadingZeroBitsFromHex } from "../core/utils.js";
import * as pooljob from "../pooljob.js";
import * as powerjob from "../powerjob.js";

export default function () {
  Alpine.data("notes", () => ({
    writeRelays: getWritableRelays() || [],
    readRelays: getReadableRelays() || [],
    theirRelays: [],
    content: "",
    difficulty: 0,
    event: null,

    get myEventPointer() {
      return this.getNeventPointer(this.event, this.writeRelays);
    },

    get myAddrPointer() {
      return this.getNaddrPointer(this.event, this.writeRelays);
    },

    get theirEventPointer() {
      return this.getNeventPointer(this.event, this.theirRelays);
    },

    get theirAddrPointer() {
      return this.getNaddrPointer(this.event, this.theirRelays);
    },

    getNeventPointer(event, relays = []) {
      if (!event) return null;
      const { id, pubkey: author } = event;
      return { id, author, relays };
    },

    getNaddrPointer(event, relays = []) {
      if (!event) return null;
      const { kind, pubkey, tags } = event;
      const [, identifier] = tags?.find(([type]) => type === "d") || [];
      if (identifier === undefined) return null;
      return { kind, identifier, pubkey, relays };
    },

    init() {
      pooljob.listen(({ id, type, event }) => {
        if (type === "event" && event.kind === 1) {
          // console.log("note", id, type, event);
          const pow = getLeadingZeroBitsFromHex(event.id);
          this.event = { event, pow };

          // TODO: this should be executed only if a note, naddr or nevent was entered by the user
          pooljob.unsub(id);
        }
      });
    },

    _mining() {
      const { content, difficulty } = this;
      const event = {
        kind: 1,
        content,
        tags: [],
      };

      return powerjob.mining(localStorage.privateKey, event, difficulty);
    },

    async onMine() {
      try {
        const event = await this._mining();
        this.event = event;
        this.content = "";
        this.difficulty = 0;
      } catch (error) {
        console.error(error);
        this.event = null;
      }
    },

    async onPublish() {
      try {
        const event = await this._mining();
        pooljob.pub(event, { relays: getWritableRelays() });
        this.event = event;
        this.content = "";
        this.difficulty = 0;
      } catch (error) {
        console.error(error);
        this.event = null;
      }
    },

    _loadBech32Entity(entity) {
      try {
        const { type, data } = nip19.decode(entity);
        switch (type) {
          case "note": {
            pooljob.req([{ kinds: [1], ids: [data] }], {
              relays: this.readRelays,
            });
            break;
          }
          case "nevent": {
            const { id, relays, author } = data;
            pooljob.req([{ ids: [id], authors: [author] }], { relays });
            break;
          }
          // parameterized replaceable event coordinate (NIP-33)
          case "naddr": {
            const { kind, identifier, pubkey, relays } = data;
            pooljob.req(
              [{ kinds: [kind], ids: [identifier], authors: [pubkey] }],
              { relays }
            );
          }
        }
      } catch (e) {
        console.log(e);
        return;
      }
    },

    async onPasteBech32Entity() {
      const entity = await navigator.clipboard.readText();
      if (!entity) return;
      this._loadBech32Entity(entity);
    },
  }));
}
