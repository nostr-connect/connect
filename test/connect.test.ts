import { getPublicKey } from 'nostr-tools';
import {
  Connect,
  ConnectMessageType,
  GetPublicKeyResponse,
  Session,
} from '../src/index';

jest.setTimeout(5000);

describe('Nostr Connect', () => {
  it('connect', async () => {
    let resolvePaired: (arg0: boolean) => void;
    let resolveGetPublicKey: (arg0: boolean) => void;
    // web app (this is ephemeral and represents the currention session)
    const webSK =
      '5acff99d1ad3e1706360d213fd69203312d9b5e91a2d5f2e06100cc6f686e5b3';
    const webPK = getPublicKey(webSK);
    console.log('webPk', webPK);

    const sessionWeb = new Session({
      target: webPK,
      relay: 'wss://nostr.vulpem.com',
      metadata: {
        name: 'My Website',
        description: 'lorem ipsum dolor sit amet',
        url: 'https://vulpem.com',
        icons: ['https://vulpem.com/1000x860-p-500.422be1bc.png'],
      },
    });
    sessionWeb.on(ConnectMessageType.PAIRED, (msg: any) => {
      expect(msg).toBeDefined();
      resolvePaired(true);
    });
    await sessionWeb.listen(webSK);

    // mobile app (this can be a child key)
    const sessionMobile = Session.fromConnectURI(sessionWeb.connectURI); // 'nostr://connect?target=...&metadata=...'
    const mobileSK =
      'ed779ff047f99c95f732b22c9f8f842afb870c740aab591776ebc7b64e83cf6c';
    const mobilePK = getPublicKey(mobileSK);
    console.log('mobilePK', mobilePK);
    await sessionMobile.pair(mobileSK);

    // we define the behavior of the mobile app for each requests
    sessionMobile.on(ConnectMessageType.GET_PUBLIC_KEY_REQUEST, async () => {
      const message: GetPublicKeyResponse = {
        type: ConnectMessageType.GET_PUBLIC_KEY_RESPONSE,
        value: {
          pubkey: mobilePK,
        },
      };
      const event = await sessionMobile.eventToBeSentToTarget(
        message,
        mobileSK
      );
      await sessionMobile.sendEvent(event, mobileSK);
      resolveGetPublicKey(true);
    });
    await sessionMobile.listen(mobileSK);

    // The WebApp send the request and wait for the response
    // The WebApp fetch the public key sending request via session
    const connect = new Connect({
      session: sessionWeb,
      targetPrivateKey: webSK,
    });
    const response = await connect.sendMessage({
      type: ConnectMessageType.GET_PUBLIC_KEY_REQUEST,
    });
    expect(response).toBeDefined();

    return expect(
      Promise.all([
        new Promise(resolve => {
          resolvePaired = resolve;
        }),
        new Promise(resolve => {
          resolveGetPublicKey = resolve;
        }),
      ])
    ).resolves.toEqual([true, true]);

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
  });
});
