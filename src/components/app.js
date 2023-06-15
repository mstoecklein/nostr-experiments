import { nip19 } from "https://esm.sh/nostr-tools@1.11.1";
import slug from "https://esm.sh/slug@8.2.2";
import { getReadableRelays, getWritableRelays } from "../core/relays.js";
import * as pooljob from "../pooljob.js";
import * as powerjob from "../powerjob.js";
import { eventPolicy } from "../core/policies/events.js";

export default function () {
  Alpine.data("appshow", () => ({
    app: null,
    apps: new Map(),

    get appdata() {
      return Array.from(this.apps.values()).map(({ event }) => {
        const identifier = event?.tags?.find(([type]) => type === "d")?.[1];
        const name = event?.tags?.find(([type]) => type === "name")?.[1];
        const contentType = event?.tags?.find(([type]) => type === "type")?.[1];
        const data = event?.content;

        return {
          naddr: nip19.naddrEncode({
            identifier,
            kind: event.kind,
            pubkey: event.pubkey,
          }),
          identifier,
          name,
          contentType,
          data,
          event,
        };
      });
    },

    init() {
      pooljob.listen(({ id, type, event, relay }) => {
        if ("xplive:appview" === id && "event" === type) {
          const currentEvent = eventPolicy(event, relay, this.apps);
          console.log("currentEvent", currentEvent);

          if (!currentEvent) {
            return;
          }

          const { tags } = event;
          if (event.kind === 31337) {
            const [, identifier] = tags?.find(([type]) => type === "d") || [
              "d",
              event.id,
            ];

            const [, name] = tags?.find(([type]) => type === "name") || [
              "name",
              "Unknown",
            ];
            const [, contentType] = tags?.find(([type]) => type === "type") || [
              "type",
              "text/html",
            ];

            const naddr = `${event.kind}:${event.pubkey}:${identifier}`;

            if (!name) {
              console.warn("no name found");
              delete this.apps[naddr];
              return;
            }
            if (!contentType) {
              console.warn("no content-type found");
              delete this.apps[naddr];
              return;
            }
          }
        }
      });

      pooljob.req([{ kinds: [5, 31337] }], {
        id: "xplive:appview",
        relays: getReadableRelays(),
      });
    },

    onShow(event) {
      const iframe = this.$refs.iframe;
      const iframeDocument =
        iframe.contentDocument || iframe.contentWindow.document;

      iframeDocument.write(event.content);
      iframeDocument.close();
    },

    onEdit(event) {
      this.$store.appdata.event = event;
    },
  }));

  Alpine.data("appcreate", () => ({
    name: "",
    contentType: "text/html",
    data: "",

    get slug() {
      return slug(this.name);
    },

    get event() {
      return this.$store.appdata.event;
    },

    init() {
      this.$watch("event", (event) => {
        if (event) {
          this.name = event.tags?.find(([type]) => type === "name")?.[1] || "";
          this.contentType =
            event.tags?.find(([type]) => type === "type")?.[1] || "text/html";
          this.data = event.content || "";
        } else {
          this.name = "";
          this.contentType = "text/html";
          this.data = "";
        }
      });
    },

    _create() {
      this.$store.appdata.name = this.name;
      this.$store.appdata.contentType = this.contentType;
      this.$store.appdata.data = this.data;

      const event = this.$store.appdata.event;
      return powerjob.mining(localStorage.privateKey, event, 0);
    },

    async onCreate() {
      try {
        const event = await this._create();
        pooljob.pub(event, { relays: getWritableRelays() });
      } catch (e) {
        console.error(e);
      } finally {
        this.onClose();
      }
    },

    onClose() {
      this.$store.appdata.event = null;
    },
  }));

  Alpine.data("appdelete", () => ({
    _delete(event, reason) {
      event = event || this.$store.appdata.event;
      const identifier = event.tags?.find(([type]) => type === "d")?.[1];

      const tags = [];
      if (identifier !== undefined) {
        tags.push(["a", `${event.kind}:${event.pubkey}:${identifier}`]);
      }

      const deletionEvent = {
        kind: 5,
        content: reason,
        tags: [["e", event.id], ...tags],
      };
      return powerjob.mining(localStorage.privateKey, deletionEvent, 0);
    },

    async onDelete(event, reason = "") {
      if (!confirm("Are you sure you want to delete this app?")) {
        return;
      }
      console.log("onDelete", event, reason);
      try {
        event = await this._delete(event, reason);
        if (event) {
          pooljob.pub(event, { relays: getWritableRelays() });
        }
      } catch (e) {
        console.error(e);
      }
    },
  }));

  Alpine.store("appdata", {
    event: null,

    get contentType() {
      const value =
        this.event?.tags?.find(([type]) => type === "type")?.[1] || "text/html";
      return value;
    },

    set contentType(value) {
      this.updateTag("type", value);
    },

    get name() {
      const value =
        this.event?.tags?.find(([type]) => type === "name")?.[1] || "";
      return value;
    },

    set name(value) {
      this.updateTag("name", value);
      this.updateTag("d", slug(value));
    },

    get data() {
      return this.event?.content || "";
    },

    set data(value) {
      this.createEventIfNotExists();
      this.event.content = value || "";
    },

    createEvent() {
      this.event = {
        kind: 31337,
        content: "",
        tags: [],
      };
    },

    createEventIfNotExists() {
      if (!this.event) {
        this.createEvent();
      }
    },

    updateTag(name, value) {
      this.createEventIfNotExists();
      const tag = this.event.tags.find(([type]) => type === name);
      if (tag) {
        tag[1] = value;
      } else {
        this.event.tags.push([name, value]);
      }
    },
  });
}
