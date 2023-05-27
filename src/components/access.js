import { getRequestState } from "./api-endpoint.js";
import { access, deny } from "../core/accessControl.js";

export default function () {
  Alpine.data("access", () => ({
    init() {
      this.requestState = getRequestState();
      this.$watch("requestState", (value) => {
        console.log("requestState changed", value);
      });
    },

    async onAccess() {
      await access();
      globalThis.close();
    },
    onDeny() {
      deny();
      globalThis.close();
    },
  }));
}
