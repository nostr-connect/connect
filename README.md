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
2. [🔐 For Remote Signer developers](#-for-wallet-developers)
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
  relayURL: 'wss://nostr.vulpem.com',
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
