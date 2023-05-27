import ApiEndpoint from "./components/api-endpoint.js";
import NIP_19 from "./components/nip19.js";
import Profile from "./components/profile.js";
import Relays from "./components/relays.js";

ApiEndpoint(window.parent);

globalThis.addEventListener("alpine:init", () => {
  NIP_19();
  Profile();
  Relays();
});
