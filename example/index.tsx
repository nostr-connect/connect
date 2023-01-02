import { getPublicKey } from 'nostr-tools';
import * as React from 'react';
import { useEffect } from 'react';

import * as ReactDOM from 'react-dom';
import { Connect, ConnectMessageType, GetPublicKeyResponse, Session } from '../src';
import { prepareResponse } from '../src/event';



const App = () => {

  useEffect(() => {
    (async () => {
/*       const webSK = "5acff99d1ad3e1706360d213fd69203312d9b5e91a2d5f2e06100cc6f686e5b3";
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
        }
      });
      sessionWeb.on(ConnectMessageType.PAIRED, (msg: any) => {
        console.log('paired event', msg);
      });
      await sessionWeb.listen(webSK);

      // mobile app (this can be a child key)
      const sessionMobile = Session.fromConnectURI(sessionWeb.connectURI);// 'nostr://connect?target=...&metadata=...'
      const mobileSK = "ed779ff047f99c95f732b22c9f8f842afb870c740aab591776ebc7b64e83cf6c";
      const mobilePK = getPublicKey(mobileSK);
      console.log('mobilePK', mobilePK);

      // we define the behavior of the mobile app for each requests
      await sessionMobile.listen(mobileSK);
      await sessionMobile.pair(mobileSK);

 */
      
    })();
  }, []);


  return (
    <div>
      <h1>Check you console</h1>
    </div>
  )
}
ReactDOM.render(<App />, document.getElementById('root'));
