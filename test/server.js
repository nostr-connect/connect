const {NostrRPCServer} = require('../src/request.js');

class Example extends NostrRPCServer {
  constructor(opts) {
    super(opts);
  }
  async ping() {
    return 'pong';
  }
}

async function main() {
  const server = new Example({
    secretKey: "ed779ff047f99c95f732b22c9f8f842afb870c740aab591776ebc7b64e83cf6c",  
  });
  await server.listen();
  console.log('Server listening on port 3000');
}