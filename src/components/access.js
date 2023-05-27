import { getRequestState } from "./api-endpoint.js";
import { access, deny } from "../core/accessControl.js";

export default function () {
  Alpine.data("access", () => ({
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
