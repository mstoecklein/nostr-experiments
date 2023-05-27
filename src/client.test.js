import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.189.0/testing/asserts.ts";
import { stub } from "https://deno.land/std@0.189.0/testing/mock.ts";
import * as NostrTools from "npm:nostr-tools";

import "./client.js";
import initClient from "./client.js";

globalThis.location = new URL("http://localhost/");

const stubbedGlobalThis = (id, type, responseData) => {
  let listener;

  const now = stub(Date, "now", () => 1234567890123);
  const random = stub(Math, "random", () => 0.4);

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

Deno.test("initClient", () => {
  const listener = stub(globalThis, "addEventListener", (type, callback) => {
    assertEquals(type, "message");
    assert(callback);
  });
  initClient();

  assert(globalThis.nostr);
  listener.restore();
});

Deno.test("getPublicKey", async () => {
  const restoreGlobalThis = stubbedGlobalThis(
    12345678901234n,
    "getPublicKey",
    "publicKey"
  );

  initClient();
  const publicKey = await globalThis.nostr.getPublicKey();

  assertEquals(publicKey, "publicKey");
  restoreGlobalThis();
});

Deno.test("getPublicKey (error)", async () => {
  const restoreGlobalThis = stubbedGlobalThis(12345678901234n, "getPublicKey", {
    error: "error",
  });

  initClient();

  try {
    await globalThis.nostr.getPublicKey();
  } catch (error) {
    assertEquals(error, new Error("error"));
  }
  restoreGlobalThis();
});

Deno.test("getRelays", async () => {
  const restoreGlobalThis = stubbedGlobalThis(12345678901234n, "getRelays", {
    "wss://relay1.test": { read: true, write: true },
    "wss://relay2.test": { read: true, write: false },
  });

  initClient();
  const relays = await globalThis.nostr.getRelays();

  assertEquals(relays, {
    "wss://relay1.test": { read: true, write: true },
    "wss://relay2.test": { read: true, write: false },
  });
  restoreGlobalThis();
});

Deno.test("signEvent", async () => {
  const privateKey = NostrTools.generatePrivateKey();
  const restoreGlobalThis = stubbedGlobalThis(
    12345678901234n,
    "signEvent",
    ({ event }) => {
      return NostrTools.finishEvent(event, privateKey);
    }
  );

  initClient();
  const event = await globalThis.nostr.signEvent({
    kind: 1,
    content: "hello, world!",
    created_at: Math.floor(Date.now() / 1000),
    tags: [],
  });

  assert(NostrTools.verifySignature(event));
  restoreGlobalThis();
});

Deno.test("nip04.encrypt", async () => {
  const myPrivateKey = NostrTools.generatePrivateKey();
  const myPublicKey = NostrTools.getPublicKey(myPrivateKey);
  const theirPrivateKey = NostrTools.generatePrivateKey();
  const theirPublicKey = NostrTools.getPublicKey(theirPrivateKey);

  const restoreGlobalThis = stubbedGlobalThis(
    12345678901234n,
    "nip04.encrypt",
    ({ pubkey, plaintext }) => {
      assertEquals(pubkey, theirPublicKey);
      return NostrTools.nip04.encrypt(myPrivateKey, pubkey, plaintext);
    }
  );

  initClient();
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
    12345678901234n,
    "nip04.decrypt",
    ({ pubkey, ciphertext }) => {
      assertEquals(pubkey, theirPublicKey);
      return NostrTools.nip04.decrypt(myPrivateKey, pubkey, ciphertext);
    }
  );

  initClient();
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
