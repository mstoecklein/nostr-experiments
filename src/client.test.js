import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.189.0/testing/asserts.ts";
import { stub } from "https://deno.land/std@0.189.0/testing/mock.ts";
import * as NostrTools from "npm:nostr-tools";

import "./client.js";
import { initNostrNIP07 } from "./client.js";

globalThis.location = new URL("http://localhost/");

const stubbedGlobalThis = (id, type, responseData) => {
  let listener;

  const now = stub(Date, "now", () => 1234567890123);
  const random = stub(Math, "random", () => 0.4567);

  const open = stub(globalThis, "open", () => ({
    addEventListener(type, callback) {
      assertEquals(type, "load");
      callback();
    },
    postMessage(requestData) {
      assertEquals(requestData.nostr.id, id);
      assertEquals(requestData.nostr.type, type);
      assertEquals(requestData.nostr.timeout, 60000);
      assert(listener);

      (async () => {
        return typeof responseData === "function"
          ? await responseData(requestData.nostr.data)
          : responseData;
      })().then((data) =>
        listener({ origin: "http://localhost", data: { nostr: { id, data } } })
      );
    },
  }));

  const postMessage = stub(globalThis, "postMessage", (data, origin) => {
    assertEquals(data.nostr.id, id);
    assertEquals(data.nostr.type, type);
    assertEquals(data.nostr.timeout, 60000);
    assertEquals(origin, "*");
  });

  const addEventListener = stub(
    globalThis,
    "addEventListener",
    (type, callback) => {
      assertEquals(type, "message");
      assert(callback);
      listener = callback;
    }
  );

  return () => {
    open.restore();
    postMessage.restore();
    addEventListener.restore();
    now.restore();
    random.restore();
  };
};

Deno.test("initNostrNIP07", () => {
  const listener = stub(globalThis, "addEventListener", (type, callback) => {
    assertEquals(type, "message");
    assert(callback);
  });
  initNostrNIP07();
  assert(globalThis.nostr);
  listener.restore();
});

Deno.test("getPublicKey", async () => {
  const restoreGlobalThis = stubbedGlobalThis(
    12345678901234567n,
    "getPublicKey",
    "publicKey"
  );

  initNostrNIP07();
  const publicKey = await globalThis.nostr.getPublicKey();
  assertEquals(publicKey, "publicKey");

  restoreGlobalThis();
});

Deno.test("getRelays", async () => {
  const restoreGlobalThis = stubbedGlobalThis(12345678901234567n, "getRelays", [
    "wss://relay1.test",
    "wss://relay2.test",
  ]);

  initNostrNIP07();
  const relays = await globalThis.nostr.getRelays();
  assertEquals(relays, ["wss://relay1.test", "wss://relay2.test"]);

  restoreGlobalThis();
});

Deno.test("signEvent", async () => {
  const privateKey = NostrTools.generatePrivateKey();
  const restoreGlobalThis = stubbedGlobalThis(
    12345678901234567n,
    "signEvent",
    ({ event }) => {
      return NostrTools.finishEvent(event, privateKey);
    }
  );

  initNostrNIP07();
  const event = await globalThis.nostr.signEvent({
    kind: 1,
    content: "hello, world!",
    created_at: Math.floor(Date.now() / 1000),
    tags: [],
  });
  assert(NostrTools.validateEvent(event));
  assert(NostrTools.verifySignature(event));

  restoreGlobalThis();
});

Deno.test("nip04.encrypt", async () => {
  const myPrivateKey = NostrTools.generatePrivateKey();
  const myPublicKey = NostrTools.getPublicKey(myPrivateKey);
  const theirPrivateKey = NostrTools.generatePrivateKey();
  const theirPublicKey = NostrTools.getPublicKey(theirPrivateKey);

  const restoreGlobalThis = stubbedGlobalThis(
    12345678901234567n,
    "nip04.encrypt",
    ({ pubkey, plaintext }) => {
      assertEquals(pubkey, theirPublicKey);
      return NostrTools.nip04.encrypt(myPrivateKey, pubkey, plaintext);
    }
  );

  initNostrNIP07();
  const ciphertext = await globalThis.nostr.nip04.encrypt(
    theirPublicKey,
    "hello, world!"
  );

  const plaintext = await NostrTools.nip04.decrypt(
    theirPrivateKey,
    myPublicKey,
    ciphertext
  );
  assertEquals(plaintext, "hello, world!");

  restoreGlobalThis();
});

Deno.test("nip04.decrypt", async () => {
  const myPrivateKey = NostrTools.generatePrivateKey();
  const myPublicKey = NostrTools.getPublicKey(myPrivateKey);
  const theirPrivateKey = NostrTools.generatePrivateKey();
  const theirPublicKey = NostrTools.getPublicKey(theirPrivateKey);

  const restoreGlobalThis = stubbedGlobalThis(
    12345678901234567n,
    "nip04.decrypt",
    ({ pubkey, ciphertext }) => {
      assertEquals(pubkey, theirPublicKey);
      return NostrTools.nip04.decrypt(myPrivateKey, pubkey, ciphertext);
    }
  );

  initNostrNIP07();
  const ciphertext = await NostrTools.nip04.encrypt(
    theirPrivateKey,
    myPublicKey,
    "hello, world!"
  );

  const plaintext = await globalThis.nostr.nip04.decrypt(
    theirPublicKey,
    ciphertext
  );
  assertEquals(plaintext, "hello, world!");

  restoreGlobalThis();
});
