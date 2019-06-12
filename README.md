# orbit-db-signal-protocol-store
signal protocol store interface for orbit-db docstore: https://github.com/signalapp/libsignal-protocol-javascript/blob/master/test/InMemorySignalProtocolStore.js

## Usage
install with npm:
```
npm install @tabcat/orbit-db-signal-protocol-store
```
create orbitdb instance: https://github.com/orbitdb/orbit-db/blob/master/README.md#usage

create the signal protocol store:
```
const docstore = await orbitdb.create('signal-protocol-store', 'docstore', { replicate:false })
// recommend disabling replication on orbit docstore so secrets are not sent to peers
const signalProtocolStore = new OrbitDBSignalProtocolStore(docstore)
// signalProtocolStore can now be used in libsignal as the store
```

using libsignal-protocol-javascript:
  - https://github.com/signalapp/libsignal-protocol-javascript/
  - https://stackoverflow.com/questions/44160427/working-example-for-signal-protocol-in-js
