import { getPublicKey, signEvent, Event } from 'nostr-tools';
import { Connect, ConnectURI, NostrSigner } from '../src';
import { sleep } from './utils';

jest.setTimeout(5000);

// web app (this is ephemeral and represents the currention session)
const webSK =
  '5acff99d1ad3e1706360d213fd69203312d9b5e91a2d5f2e06100cc6f686e5b3';
const webPK = getPublicKey(webSK);
//console.debug('webPk', webPK);

// mobile app with keys with the nostr identity
const mobileSK =
  'ed779ff047f99c95f732b22c9f8f842afb870c740aab591776ebc7b64e83cf6c';
const mobilePK = getPublicKey(mobileSK);
//console.debug('mobilePK', mobilePK);

class MobileHandler extends NostrSigner {
  async get_public_key(): Promise<string> {
    return getPublicKey(this.self.secret);
  }
  async sign_event(event: any): Promise<string> {
    if (!this.event) throw new Error('No origin event');

    // emit event to the UI to show a modal
    this.events.emit('sign_event_request', event);

    // wait for the user to approve or reject the request
    return new Promise((resolve, reject) => {
      // listen for user acceptance
      this.events.on('sign_event_approve', () => {
        resolve(signEvent(event, this.self.secret));
      });

      // or rejection
      this.events.on('sign_event_reject', () => {
        reject(new Error('User rejected request'));
      });
    });
  }
}

describe('Nostr Connect', () => {
  it('roundtrip connectURI', async () => {
    const connectURI = new ConnectURI({
      target: `b889ff5b1513b641e2a139f661a661364979c5beee91842f8f0ef42ab558e9d4`,
      relay: 'wss://nostr.vulpem.com',
      metadata: {
        name: 'Vulpem',
        description:
          'Enabling the next generation of bitcoin-native financial services',
        url: 'https://vulpem.com',
        icons: ['https://vulpem.com/1000x860-p-500.422be1bc.png'],
      },
    });
    const url = ConnectURI.fromURI(connectURI.toString());
    expect(url.target).toBe(
      'b889ff5b1513b641e2a139f661a661364979c5beee91842f8f0ef42ab558e9d4'
    );
    expect(url.relay).toBe('wss://nostr.vulpem.com');
    expect(url.metadata.name).toBe('Vulpem');
    expect(url.metadata.description).toBe(
      'Enabling the next generation of bitcoin-native financial services'
    );
    expect(url.metadata.url).toBe('https://vulpem.com');
    expect(url.metadata.icons).toBeDefined();
    expect(url.metadata.icons!.length).toBe(1);
    expect(url.metadata.icons![0]).toBe(
      'https://vulpem.com/1000x860-p-500.422be1bc.png'
    );
  });
  it.skip('connect', async () => {
    const testHandler = jest.fn();

    // start listening for connect messages on the web app
    const connect = new Connect({ secretKey: webSK });
    connect.events.on('connect', testHandler);
    await connect.init();

    await sleep(100);

    // send the connect message to the web app from the mobile
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
    await connectURI.approve(mobileSK);

    expect(testHandler).toBeCalledTimes(1);
  });

  it('returns pubkey', async () => {
    // start listening for connect messages on the mobile app
    const remoteHandler = new MobileHandler({
      secretKey: mobileSK,
      relay: 'wss://nostr.vulpem.com',
    });
    await remoteHandler.listen();

    await sleep(1000);

    // start listening for connect messages on the web app
    const connect = new Connect({
      secretKey: webSK,
      target: mobilePK,
    });
    await connect.init();

    await sleep(1000);

    // send the get_public_key message to the mobile app from the web
    const pubkey = await connect.getPublicKey();
    expect(pubkey).toBe(mobilePK);
  });

  it.skip('returns a signed event', async () => {
    // start listening for connect messages on the mobile app
    const remoteHandler = new MobileHandler({
      secretKey: mobileSK,
      relay: 'wss://nostr.vulpem.com',
    });

    // define how to comnsume the event

    remoteHandler.events.on('sign_event_request', (event: Event) => {
      // ⚠️⚠️⚠️ IMPORTANT: always check if the app is connected
      //if (!remoteHandler.isConnected(event.pubkey)) return;
      // assume  user clicks on approve button on the UI
      remoteHandler.events.emit('sign_event_approve');
    });

    // add app as connected app
    remoteHandler.addConnectedApp(webPK);

    // start listening for request messages on the mobile app
    await remoteHandler.listen();

    await sleep(1000);

    // start listening for connect messages on the web app
    const connect = new Connect({
      secretKey: webSK,
      target: mobilePK,
    });
    await connect.init();

    await sleep(1000);

    const event = await connect.signEvent({
      kind: 1,
      pubkey: mobilePK,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: '🏃‍♀️ Testing Nostr Connect',
    });
    expect(event).toBeDefined();
  });
});

/*    
       expect(handler).toBeCalledTimes(1);
    expect(handler).toBeCalledWith({
      type: ConnectMessageType.PAIRED,
      value: {
        pubkey: mobilePK,
      }
    });

        const pubkey = await connect.getPublicKey();
    expect(pubkey).toBe(mobilePK);
    const signedEvt = await connect.signEvent({});
       const relays = await connect.getRelays();
       
       const plainText = "hello 🌍";
       const cipherText = await connect.nip04.encrypt(childPK, plainText);
       const plainText2 = await connect.nip04.decrypt(childPK, cipherText);
       expect(plainText === plainText2).toBeTruthy();
 
       await connect.request({
         method: 'signSchnorr',
         params: [
           '0x000000',
           '0x000000'
         ]
       }); 
       

        sessionWeb.on(ConnectMessageType.UNPAIRED, () => {
        });

       */
