# 🔌 Nostr Connect SDK for TypeScript
Nostr Connect SDK for TypeScript is a library that allows you to easily integrate Nostr Connect into your web application.


## 📦 Installation
You can install the SDK using npm or yarn:

```bash 
npm install @nostr-connect/connect
# or with yarn
yarn add @nostr-connect/connect
```


## 📖 Usage 

1. [👩‍💻 For Apps developers](#-for-apps-developers)
2. [🔐 For Wallet & Remote Signer developers](#-for-wallet-developers)


## 👩‍💻 For Apps developers

### Create an ephemeral key

To use the SDK, you need to create an ephemeral key. This key is used to authenticate your user and to create a session.

```typescript
import { generatePrivateKey } from 'nostr-tools';

const sk = generatePrivateKey();
```


### Create a Nostr Connect instance

To create a Nostr Connect instance, you need to provide the ephemeral key and the Nostr Connect URL.

```typescript
import { Connect } from '@nostr-connect/connect';


const connect = new Connect({ secretKey: sk, relay: 'wss://nostr.vulpem.com' });
connect.events.on('connect', ( walletPubkey:string ) => {
  console.log('connected with wallet: ' + walletPubkey);
});
await connect.init();
```

### Generate a ConnectURI and display it to the user


```typescript
const connectURI = new ConnectURI({
  target: webPK,
  relay: 'wss://nostr.vulpem.com',
  metadata: {
    name: 'My Website',
    description: 'lorem ipsum dolor sit amet',
    url: 'https://vulpem.com',
    icons: ['https://vulpem.com/1000x860-p-500.422be1bc.png'],
  },
});

const uri = connectURI.toString();
```


### Start making requests

```typescript
// send the get_public_key message to the mobile app 
const pubkey = await connect.getPublicKey();

// send the sign_event message to the mobile app
const sig = await connect.signEvent(event);
```

## 🔐 For Wallet developers

### 🤓 Define your methods

As per [NIP-46](https://github.com/nostr-connect/nips/blob/nostr-connect/46.md), the Signer app **MUST** implement the following RPC methods:

- `get_public_key`
- `sign_event`

You need to define these methods in your app, each method must return a `Promise` that resolves to the expected result.

The NostrSigner class provides access to the Nostr public key via `this.self.pubkey`, the Nostr private key via `this.self.secret` and the full Nostr event that originated the current request.  You can access the event using the `this.event` property.

It's best to ask approval from the user before signing an event. To do so, you can emit an event to the UI and wait for the user to approve or reject the request.

```typescript
import { NostrSigner } from '@nostr-connect/connect';
import { getPublicKey, signEvent, nip06 } from 'nostr-tools';

const sk = nip06.privateKeyFromSeedWords(myWords);

class MobileHandler extends NostrSigner {

  async get_public_key(): Promise<string> {
    return getPublicKey(sk);
  }

  async sign_event(event: Event): Promise<string> {
    if (!this.event) throw new Error('No origin event');

    // emit event to the UI to show a modal
    this.events.emit('sign_event_request', event);

    // wait for the user to approve or reject the request
    return new Promise((resolve, reject) => {
      
      // listen for user accept 
      this.events.on('sign_event_approve', () => {
        resolve(signEvent(event, this.self.secret));
      });

      // or reject
      this.events.on('sign_event_reject', () => {
        reject(new Error('User rejected request'));
      });
    });
  }
}
```

### 📱 Create a MobileHandler instance

Generate a key to identify the remote signer, it is used to be reached by the apps. At the moment it's your duty to persist locally a list of the apps that are allowed to connect to your remote signer.

```typescript
// random key
const secretKey = secp.utils.bytesToHex(secp.utils.randomPrivateKey());
// create a new instance of the MobileHandler 
const handler = new MobileHandler({ secretKey });

// define how to consume the sign_event_request events
remoteHandler.events.on('sign_event_request',
  (event: Event) => {
    // ⚠️⚠️⚠️ IMPORTANT: always check if the app is connected 

    // do your UI stuff here to ask the user to approve or reject the request    

    // UI components can accept the sign
    //this.events.emit('sign_event_approve');
    
    // or reject 
    //this.events.emit('sign_event_reject');
  }
);

// 📡 Listen for incoming requests
await remoteHandler.listen();
``` 

### 🔌 Intercept ConnectURI

Allow user to scan the QR code and extract the ConnectURI, intercept it via deep linking or let use manually copy-paste the URI.

```typescript
// Show to the user the pubkey
const { target, relay, metadata } = ConnectURI.fromURI(text);

// if he consents send the connect message
await connectURI.approve(key);
// if rejects could be polite to notify the app of the rejection
await connectURI.reject(key);
```
