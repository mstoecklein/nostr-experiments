export function getReadableRelays() {
  return Object.entries(JSON.parse(localStorage.relays || "{}"))
    .filter(([_, { read }]) => read)
    .map(([url]) => url);
}

export function getWritableRelays() {
  return Object.entries(JSON.parse(localStorage.relays || "{}"))
    .filter(([_, { write }]) => write)
    .map(([url]) => url);
}
