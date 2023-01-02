# Nostr Connect


## Nostr Connect 
PAIRING

1. User clicks on "Connect" button on a website or scan it with a QR code
2. It will show an URI to open a "nostr-connect" enabled Wallet 
3. In the URI there is a pubkey of the App ie. nc://<pubkey>
4. The Wallet will send a kind 4 encrypted message to ACK the pairing request, along with his public key


ENABLE

1. The App will send a kind 4 encrypted message with metadata to the Wallet with a Enable Request
2. The Wallet will show a popup to the user to enable the App to requesta data or remote siging requests
3. The Wallet will send a kind 4 encrypted message to ACK the Enable Request or reject it
4. All others subsequent Enabled Requests will be ACKed automatically

DELEGATE

1. The App will send a kind 4 encrypted message with metadata to the Wallet with a Delegate Request
2. The Wallet will show a popup to the user to delegate the App to sign with a child key
3. The Wallet will send a kind 4 encrypted message to ACK the Delegate Request with the child private key or reject it
4. All others subsequent Delegate Requests will be ACKed automatically

REMOTE SIGNING

1. The App will send a kind 4 encrypted message with metadata to the Wallet with a Sign Event Request
2. The Wallet will show a popup to the user to sign the event
3. The Wallet will send a kind 4 encrypted message to ACK the Sign Event Request with the signed event or reject it