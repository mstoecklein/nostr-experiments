# nostr-profile

This repository is a workbench for testing several nostr implementation possibilities (NIPs).
Feel free to fork and do your own things with it.

## Proof-of-Work (Mining)

My adblocker had an issue with the name `miner.js`, so I called it `PoWer.js` (Proof-of-Work (min)er). You're welcome strangers in exploring [NIP-13](https://github.com/nostr-protocol/nips/blob/master/13.md).

I have a `mining.html` file. You should have at least one relay registered in your local storage to make it work. You can use the `relays.html` file to register a relay.

## NIP-07 Capability for Web Browsers

Use the `client.html` to test the `window.nostr` functions.

- [x] `window.nostr.getPublicKey()`
- [x] `window.nostr.getRelays()`
- [x] `window.nostr.nip04.encrypt(pubkey, plaintext)`
- [x] `window.nostr.nip04.decrypt(pubkey, ciphertext)`
- [x] `window.nostr.signEvent(event)`
- [x] `window.nostr.nip26.createDelegation(pubkey, { kind: number, until: number, since: number })`

More info on [NIP-07](https://github.com/nostr-protocol/nips/blob/master/07.md).

## Tests

The tests work if you run them one at a time. I won't fix it any time soon.
