import { getPublicKey } from 'nostr-tools';
import * as React from 'react';
import { useEffect } from 'react';

import * as ReactDOM from 'react-dom';
import { Connect, ConnectMessageType, GetPublicKeyResponse, Session } from '../src';
import { prepareResponse } from '../src/event';



const App = () => {

  useEffect(() => {
    (async () => {
      
    })();
  }, []);


  return (
    <div>
      <h1>Check you console</h1>
    </div>
  )
}
ReactDOM.render(<App />, document.getElementById('root'));
