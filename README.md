# nostr-profile

This repository is a workbench for testing several nostr implementation possibilities (NIPs).
Feel free to fork and do your own things with it.

You can run the HTML files without any compiler steps. The only framework I use is [AlpineJS](https://alpinejs.dev) for reactivity. I think it's self-explanatory if you look in the code.

## Proof-of-Work (Mining)

My adblocker had an issue with the name `miner.js`, so I called it `PoWer.js` (Proof-of-Work (min)er). You're welcome strangers in exploring [NIP-13](https://github.com/nostr-protocol/nips/blob/master/13.md).

I have a `mining.html` file. You should have at least one relay registered in your local storage to make it work. You can use the `relays.html` file to register a relay.

### Mining Workflow

I use a Worker `power_worker.js` to execute the heavy load of mining. It would definitely freeze your browser window.

main thread:
```js
const miner = new Worker('./power_worker.js', {type:'module'});
miner.onmessage = ev => console.log(ev.data);

miner.postMessage({
  privateKey: '<YOUR_PRIVATE_KEY>',
  
  // Must be a valid Nsotr event
  event: { ... },
  
  // Reasonable wait time: 16-21 (everything above takes time)
  difficulty: 16
});
```

## NIP-07 Capability for Web Browsers

Use the `client.html` to test the `window.nostr` functions.

- [x] `window.nostr.getPublicKey()`
- [x] `window.nostr.getRelays()`
- [x] `window.nostr.signEvent(event)`
- [x] `window.nostr.nip04.encrypt(pubkey, plaintext)`
- [x] `window.nostr.nip04.decrypt(pubkey, ciphertext)`
- [x] `window.nostr.nip26.createDelegation(pubkey, { kind: number, until: number, since: number })`

More info on [NIP-07](https://github.com/nostr-protocol/nips/blob/master/07.md).

## Tests

The tests work if you run them one at a time. I won't fix it any time soon.
