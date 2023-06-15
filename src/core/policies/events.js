// NIP-09: Event Deletion
// NIP-16: Event Treatments
// NIP-33: Parametrized Replacable Events

const removables = new Map();

export function eventPolicy(event, relay, events = new Map()) {
  let output;

  if (5 === event.kind) {
    // delete event
    const naddrs =
      event.tags?.filter(([type]) => type === "a")?.map(([, id]) => id) || [];
    const eventIds =
      event.tags?.filter(([type]) => type === "e")?.map(([, id]) => id) || [];

    for (const naddr of naddrs) {
      if (events.has(naddr)) {
        const { event: stored } = events.get(naddr);
        if (stored.created_at < event.created_at) {
          events.delete(naddr);
        }
      }
      removables.set(naddr, event.created_at);
      console.log("delete event", naddr);
    }

    // delete replacable events
    for (const { event: stored } of events.values()) {
      if (
        eventIds.includes(stored.id) &&
        ([0, 2, 3].includes(stored.kind) ||
          (stored.kind >= 10000 && stored.kind < 20000))
      ) {
        // only delete if event is older than delete event
        if (stored.created_at < event.created_at) {
          const addr = `${stored.pubkey}:${stored.kind}`;
          events.delete(addr);
        }
        removables.set(addr, event.created_at);
        console.log("delete event", addr);
      }
    }

    // delete normal events
    for (const id of eventIds) {
      if (events.has(id)) {
        const { event: stored } = events.get(id);

        // only delete if event is older than delete event
        if (stored.created_at < event.created_at) {
          events.delete(id);
        }
      }
      removables.set(id, event.created_at);
      console.log("delete event", id);
    }
    return;
  }

  // skip event if removable entry exists and the current event
  // is older than the removable event
  if (removables.has(event.id) && event.created_at < removables.get(event.id)) {
    console.log("skip event", event.id);
    return;
  }

  if (
    [0, 2, 3].includes(event.kind) ||
    (event.kind >= 10000 && event.kind < 20000)
  ) {
    // replacable event
    const addr = `${event.pubkey}:${event.kind}`;

    // skip event if removable entry exists and the current event
    // is older than the removable event
    if (removables.has(addr) && event.created_at < removables.get(addr)) {
      console.log("skip event", addr);
      return;
    }

    output = events.get(addr);
    if (!output || event.created_at > output?.event?.created_at) {
      const relays = output?.relays || [];
      events.set(
        addr,
        (output = {
          event,
          relays: [...new Set([...relays, relay])],
        })
      );
      console.log("replace event");
    } else {
      // update relay
      output.relays = [...new Set([...output.relays, relay])];
    }
  } else if (event.kind >= 30000 && event.kind < 40000) {
    // parametrized replacable event
    const [, identifier] = event.tags.find(([type]) => type === "d") || [, ""];
    const addr = `${event.kind}:${event.pubkey}:${identifier}`;

    // skip event if removable entry exists and the current event
    // is older than the removable event
    if (removables.has(addr) && event.created_at < removables.get(addr)) {
      console.log("skip event", addr);
      return;
    }

    output = events.get(addr);
    if (!output || event.created_at > output?.event?.created_at) {
      const relays = output?.relays || [];
      events.set(
        addr,
        (output = {
          event,
          relays: [...new Set([...relays, relay])],
        })
      );
      console.log("replace event");
    } else {
      // update relay
      output.relays = [...new Set([...output.relays, relay])];
    }
  } else if (events.has(event.id)) {
    output = events.get(event.id);
    output.relays = [...new Set([...output.relays, relay])];
  } else {
    events.set(event.id, (output = { event, relays: [relay] }));
  }

  return output;
}
