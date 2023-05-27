import { /* getPublicKey, */ nip19 } from "https://esm.sh/nostr-tools@1.11.1";
import { getLeadingZeroBitsFromHex } from "../PoWer.js";
import * as pooljob from "../pooljob.js";
// import * as powerjob from "../powerjob.js";
import { getReadableRelays } from "../core/relays.js";

export default function () {
  Alpine.data("notes", () => ({
    event: null,

    init() {
      pooljob.listen(({ id, type, event }) => {
        if (type === "event" && event.kind === 1) {
          console.log("note", id, type, event);
          const pow = getLeadingZeroBitsFromHex(event.id);
          this.event = { event, pow };

          // TODO: this should be executed only if a note, naddr or nevent was entered by the user
          pooljob.unsub(id);
        }
      });
    },

    load(note) {
      note = note || this.$el.value;
      if (!note) return;
      try {
        const { type, data } = nip19.decode(note);
        switch (type) {
          case "note": {
            pooljob.req([{ kinds: [1], ids: [data] }], {
              relays: getReadableRelays(),
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
  }));
}
