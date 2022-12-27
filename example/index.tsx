import 'react-app-polyfill/ie11';
import * as React from 'react';
import { useEffect } from 'react';
import * as ReactDOM from 'react-dom';
import { Session } from '../src/index';
import { generatePrivateKey, getPublicKey, nip04, relayInit } from 'nostr-tools'

const App = () => {
  /* useEffect(() => {
    (async () => {
    })();
  }, []); */

  const [walletKey, setWalletKey] = React.useState<{ pk: string; sk: string }>();
  const [sessionHolder, setSession] = React.useState<Session>();
  const [request, setRequest] = React.useState<any>();


  const newWallet = () => {
    //this is the wallet public key
    let sk = generatePrivateKey()
    let pk = getPublicKey(sk)
    setWalletKey({ pk, sk });
  }

  const newSession = async () => {

    const session = new Session({
      name: 'Auth',
      description: 'lorem ipsum dolor sit amet',
      url: 'https://vulpem.com',
      icons: ['https://vulpem.com/1000x860-p-500.422be1bc.png'],
    });
    
    await session.startPairing(walletKey?.pk);    
    setSession(session);
  };

  const listen = async () => {
    if (!sessionHolder) return;

    // let's query for an event to this wallet pub key
    const relay = relayInit('wss://nostr.vulpem.com');
    await relay.connect()

    relay.on('connect', () => {
      console.log(`wallet: connected to ${relay.url}`)
    })
    relay.on('error', () => {
      console.log(`wallet: failed to connect to ${relay.url}`)
    })

    let sub = relay.sub([{ kinds: [4] }])
    // on the receiver side
    sub.on('event', async (event) => {
      if (!walletKey) return;

      const mention = event.tags.find(([k, v]) => k === 'p' && v && v !== '')[1]
      if (mention !== walletKey.pk) return;

      const plaintext = await nip04.decrypt(walletKey?.sk, sessionHolder.pubKey, event.content);
      console.log('wallet', event.id, event.pubkey, JSON.parse(plaintext));
      setRequest(JSON.parse(plaintext));
    })

    sub.on('eose', () => {
      sub.unsub()
    })
  }

  return (
    <div>
      <h1>💸 Wallet</h1>
      {walletKey && <p> 🔎 Wallet Pub: {walletKey?.pk} </p>}
      <button onClick={newWallet}>Create Wallet</button>
      <button disabled={!sessionHolder} onClick={listen}>Listen</button>
      {request && <div>
        <h1>📨 Incoming Request</h1>
        <img height={80} src={request?.icons[0]} />
        <p>
          Name <b>{request?.name}</b>
        </p>
        <p>
          Description <b>{request?.description}</b>
        </p>
        <p>
          URL: <b>{request?.url}</b>
        </p>
      </div>}
      <hr />
      <h1> App </h1>
      <button disabled={!walletKey} onClick={newSession}>New Session</button>
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));
