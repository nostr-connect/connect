import * as React from 'react';
import { useEffect, useState } from 'react';
import { useStatePersist } from 'use-state-persist';

import * as ReactDOM from 'react-dom';
import { broadcastToRelay, Connect, connectToRelay, ConnectURI } from '../src';

import { QRCodeSVG } from 'qrcode.react';
import { getEventHash, getPublicKey, Event } from 'nostr-tools';

const secretKey = "5acff99d1ad3e1706360d213fd69203312d9b5e91a2d5f2e06100cc6f686e5b3";
const connectURI = new ConnectURI({
  target: getPublicKey(secretKey),
  relayURL: 'wss://nostr.vulpem.com',
  metadata: {
    name: 'Example',
    description: '🔉🔉🔉',
    url: 'https://example.com',
    icons: ['https://example.com/icon.png'],
  },
});

const App = () => {
  const [pubkey, setPubkey] = useStatePersist('@pubkey', '');
  const [getPublicKeyReply, setGetPublicKeyReply] = useState('');
  const [eventWithSig, setEvent] = useState({});

  useEffect(() => {
    (async () => {
      const target = pubkey.length > 0 ? pubkey : undefined;
      const connect = new Connect({
        secretKey,
        target,
      });
      connect.events.on('connect', (pubkey: string) => {
        console.log('We are connected to ' + pubkey)
        setPubkey(pubkey);
      });
      connect.events.on('disconnect', () => {
        console.log('We got disconnected')
        setEvent({});
        setPubkey('');
        setGetPublicKeyReply('');
      });
      await connect.init();
    })();
  }, []);


  const getPub = async () => {
    if (pubkey.length === 0) return;
    const connect = new Connect({
      secretKey,
      target: pubkey,
    });
    const pk = await connect.getPublicKey();
    setGetPublicKeyReply(pk);
  }

  const sendMessage = async () => {
    if (pubkey.length === 0) return;

    const connect = new Connect({
      secretKey,
      target: pubkey,
    });

    let event: Event = {
      kind: 1,
      pubkey: pubkey,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: "Running Nostr Connect 🔌"
    };
    event.id = getEventHash(event)
    event.sig = await connect.signEvent(event);
    const relay = await connectToRelay('wss://relay.damus.io');
    await broadcastToRelay(relay, event);

    setEvent(event);
  }

  const isConnected = () => {
    return pubkey.length > 0;
  }

  return (
    <>
      <section className="container">
        <div className='content'>
          <h1 className='title'>Nostr Connect Playground</h1>
        </div>
        <div className='content'>
          <p className='subtitle is-6'><strong>Nostr ID</strong> {getPublicKey(secretKey)}</p>
        </div>
        <div className='content'>
          <p className='subtitle is-6'><strong>Status</strong> {isConnected() ? '🟢 Connected' : '🔴 Disconnected'}</p>
        </div>
        {!isConnected() && <div className='content has-text-centered'>
          <div className='notification is-info'>
            <h2 className='title is-5'>Connect with Nostr</h2>
            <QRCodeSVG value={connectURI.toString()} />
            <input
              className='input is-info'
              type='text'
              value={connectURI.toString()}
              readOnly
            />
          </div>
        </div>}
      </section>
      <section className="container mt-6">
        {
          isConnected() &&
          <>
            <div className='content'>
              <h2 className='title is-5'>Get Public Key</h2>
              <button className='button is-info' onClick={getPub}>
                Get public key
              </button>
              {getPublicKeyReply.length > 0 && <input
                className='input is-info mt-3'
                type='text'
                value={getPublicKeyReply}
                readOnly
              />}
            </div>
            <div className='content'>
              <h2 className='title is-5'>Send a message with text <b>Running Nostr Connect 🔌</b></h2>
              <button className='button is-info' onClick={sendMessage}>
                Send message to Nostr
              </button>
              {
                Object.keys(eventWithSig).length > 0 &&
                <textarea
                  className="textarea"
                  readOnly
                  rows={12}
                  defaultValue={JSON.stringify(eventWithSig, null, 2)}
                />
              }
            </div>
          </>
        }
      </section>
    </>


  )
}
ReactDOM.render(<App />, document.getElementById('root'));
