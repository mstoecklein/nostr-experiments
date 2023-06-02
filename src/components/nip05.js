// import { nip05 } from "https://esm.sh/nostr-tools@1.11.1";

export default function () {
  Alpine.data("nip05", () => ({
    fullname: null,
    data: null,
    async check() {
      const [name, domain] = this.fullname.split("@");
      if (!name || !domain) return;
      const res = await fetch(
        `http://${domain}/.well-known/nostr.json?name=${name}`
      );
      if (!res.ok) return;
      this.data = await res.json();
    },

    async getAll() {
      const res = await fetch(`http://localhost:3000/.well-known/nostr.json`);
      if (!res.ok) return;
      this.data = await res.json();
    },
  }));
}
