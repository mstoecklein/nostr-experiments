import ApiEndpoint from "./components/api-endpoint.js";
import Access from "./components/access.js";
import Profile from "./components/profile.js";

ApiEndpoint(window.opener);

globalThis.addEventListener("alpine:init", () => {
  Access();
  Profile();
});
