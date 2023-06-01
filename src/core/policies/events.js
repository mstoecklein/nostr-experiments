// NIP-16: Event Treatments
// NIP-33: Parametrized Replacable Events
export function eventPolicy(event, relay, events = {}) {
  let output;
  if (
    [0, 2, 3].includes(event.kind) ||
    (event.kind >= 10000 && event.kind < 20000)
  ) {
    // replacable event
    const addr = `${event.pubkey}:${event.kind}`;
    output = events[addr];
    if (!output || event.created_at > output?.event?.created_at) {
      const relays = events[addr]?.relays || [];
      output = events[addr] = {
        event,
        relays: [...new Set([...relays, relay])],
      };
      console.log("replace event");
    } else {
      // update relay
      output.relays = [...new Set([...output.relays, relay])];
    }
  } else if (event.kind >= 30000 && event.kind < 40000) {
    // parametrized replacable event
    const [, identifier] = event.tags.find(([type]) => type === "d");
    const addr = `${event.kind}:${event.pubkey}:${identifier}`;
    output = events[addr];
    if (!output || event.created_at > output?.event?.created_at) {
      const relays = events[addr]?.relays || [];
      output = events[addr] = {
        event,
        relays: [...new Set([...relays, relay])],
      };
      console.log("replace event");
    } else {
      // update relay
      output.relays = [...new Set([...output.relays, relay])];
    }
  } else if (events[event.id]) {
    output = events[event.id];
    output.relays = [...new Set([...output.relays, relay])];
  } else {
    output = events[event.id] = { event, relays: [relay] };
  }

  return output;
}
