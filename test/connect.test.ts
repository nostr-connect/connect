import { getPublicKey } from 'nostr-tools';
import { Connect, ConnectURI, NostrRPC } from '../src';
import { sleep } from './utils';

jest.setTimeout(5000);

// web app (this is ephemeral and represents the currention session)
const webSK =
  '5acff99d1ad3e1706360d213fd69203312d9b5e91a2d5f2e06100cc6f686e5b3';
const webPK = getPublicKey(webSK);
console.log('webPk', webPK);

// mobile app with keys with the nostr identity
const mobileSK =
  'ed779ff047f99c95f732b22c9f8f842afb870c740aab591776ebc7b64e83cf6c';
const mobilePK = getPublicKey(mobileSK);
console.log('mobilePK', mobilePK);

class MobileHandler extends NostrRPC {
  async get_public_key(): Promise<string> {
    return getPublicKey(this.self.secret);
  }
}

describe('Nostr Connect', () => {
  it('connect', async () => {
    const testHandler = jest.fn();

    // start listening for connect messages on the web app
    const connect = new Connect({ secretKey: webSK });
    connect.events.on('connect', testHandler);
    await connect.init();

    await sleep(100);

    // send the connect message to the web app from the mobile
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
    await connectURI.approve(mobileSK);

    expect(testHandler).toBeCalledTimes(1);
  });

  it.only('returns pubkey', async () => {
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
          console.log('unpaired');
        });

       */
