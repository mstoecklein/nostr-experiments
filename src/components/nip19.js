import { nip19 } from "https://esm.sh/nostr-tools@1.11.1";
import { setRange, getRange } from "https://esm.sh/selection-ranges@3.0.3";

export default function () {
  Alpine.data("nip19", () => ({
    obfuscate: false,
    inputValue: null,
    outputValue: null,

    toggleObfuscate() {
      this.obfuscate = !this.obfuscate;
    },

    genNSEC() {
      try {
        if (this.inputValue?.length > 0) {
          this.outputValue = nip19.nsecEncode(this.inputValue);
        } else {
          this.outputValue = null;
        }
        this.obfuscate = true;
      } catch {
        // ignore
      }
    },

    genNPUB() {
      try {
        if (this.inputValue?.length > 0) {
          this.outputValue = nip19.npubEncode(this.inputValue);
        } else {
          this.outputValue = null;
        }
        this.obfuscate = false;
      } catch {
        // ignore
      }
    },

    render(altText = "") {
      const obfuscate = this.obfuscate;
      if (this.outputValue) {
        const [, prefix, data] = this.outputValue.match(
          /^(nprofile|nrelay|nevent|naddr|nsec|npub|note)?(.+)$/
        );
        if (prefix) {
          return /*html*/ `<b>${prefix}</b>${
            obfuscate ? "****************" : data
          }`;
        }
        return data;
      }
      return altText;
    },

    extractNSEC(input) {
      if (!input) return false;
      try {
        const { type, data } = nip19.decode(input);
        if (type === "nsec") {
          this.inputValue = data;
          this.outputValue = input;
          return true;
        }
      } catch {
        // ignore
      }
      return false;
    },

    extractNPUB(input) {
      if (!input) return false;
      try {
        const { type, data } = nip19.decode(input);
        if (type === "npub") {
          this.inputValue = data;
          this.outputValue = input;
          return true;
        }
      } catch {
        // ignore
      }
      return false;
    },

    onClick() {
      const input = this.$el;
      const { length: end } = input.textContent || "";
      if (end > 0) {
        setRange(input, { start: 0, end });
      }
    },

    onBackspace() {
      this.inputValue = null;
      this.outputValue = null;
    },

    async onPasteNSEC() {
      const input = await navigator.clipboard.readText();
      const isNsec = this.extractNSEC(input);
      if (!isNsec) {
        this.inputValue = input;
        this.genNSEC();
      }
      this.obfuscate = true;
    },

    async onPasteNPUB() {
      const input = await navigator.clipboard.readText();
      const isNpub = this.extractNPUB(input);
      if (!isNpub) {
        this.inputValue = input;
        this.genNPUB();
      }
      this.obfuscate = false;
    },

    onContenteditableInput() {
      const input = this.$el;
      const text = (input.textContent || "").trim();
      const offset = getRange(input);
      const [, prefix, data] =
        text.match(/^(nprofile|nrelay|nevent|naddr|nsec|npub|note)?(.*)$/) ||
        [];
      input.textContent = "";

      // validation of NPUB and NSEC values
      const isNpubOrNsec = prefix === "npub" || prefix === "nsec";
      const isValidNpubOrNsec = isNpubOrNsec && text.length === 63;

      // allow other value formats like nprofile, nrelay, nevent, naddr, note
      // as well as valid npub and nsec values
      if (prefix && data && (!isNpubOrNsec || isValidNpubOrNsec)) {
        // render the valid value
        const b = document.createElement("b");
        b.textContent = prefix;
        input.appendChild(b);
        input.appendChild(document.createTextNode(data));
      } else if (text) {
        // render the invalid value
        const del = document.createElement("del");
        del.textContent = text;
        input.appendChild(del);
      }
      setRange(input, offset);
    },
  }));
}
