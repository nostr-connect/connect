import * as React from 'react';
import { useEffect, useState } from 'react';

import * as ReactDOM from 'react-dom';
import { NostrRPC } from '../src/rpc';


class Server extends NostrRPC {
  async ping(): Promise<string> {
    return 'pong';
  }
}
const server = new Server({
  secretKey:
    'ed779ff047f99c95f732b22c9f8f842afb870c740aab591776ebc7b64e83cf6c',
});
const client = new NostrRPC({
  secretKey:
    '5acff99d1ad3e1706360d213fd69203312d9b5e91a2d5f2e06100cc6f686e5b3',
});

const App = () => {

  const [response, setResponse] = useState('');

  useEffect(() => {
    (async () => {
      await server.listen();
    })();
  }, []);


  const makeCall = async () => {
    const result = await client.call({
      target: server.self.pubkey,
      request: { method: 'ping' },
    });
    setResponse(result);
  }


  return (
    <div>
      <h1>Nostr Connect Playground</h1>
      <p>Server pubkey: {server.self.pubkey}</p>
      <p>Client pubkey: {client.self.pubkey}</p>
      <hr />
      <button onClick={makeCall}>Ping</button>
      <br />
      <p> {response} </p>
    </div>
  )
}
ReactDOM.render(<App />, document.getElementById('root'));
