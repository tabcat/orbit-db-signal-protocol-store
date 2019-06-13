
const util = require('./helpers.js')

class OrbitDBSignalProtocolStore {
  constructor(orbitDocstore) {
    this.store = orbitDocstore
  }

  Direction = {
    SENDING: 1,
    RECEIVING: 2,
  }

  getIdentityKeyPair = () => Promise.resolve(this.get('identityKey'))
  getLocalRegistrationId = () => Promise.resolve(this.get('registraionId'))

  put = async (key, value) => {
    if (key === undefined || value === undefined || key === null || value === null) {
      throw new Error("Tried to store undefined/null")
    }
    return await this.store.put({_id:key, value})
  }
  get = async (key, defaultValue) => {
    if (key === null || key === undefined) {
      throw new Error("Tried to get value for undefined/null key")
    }
    const doc = this.store.query((doc) => doc._id === key)
    return doc.length !== 0
    ? doc[0].value
    : defaultValue
  }
  remove = async (key) => {
    if (key === null || key === undefined) {
      throw new Error("Tried to remove value for undefined/null key")
    }
    return await this.store.del(key)
  }

  isTrustedIdentity = (identifier, identityKey, direction) {
    if (identifier === null || identifier === undefined) {
      throw new Error("tried to check identity key for undefined/null key")
    }
    if (!(identityKey instanceof ArrayBuffer)) {
      throw new Error("Expected identityKey to be an ArrayBuffer")
    }
    const trusted = this.get('identityKey' + identifier)
    return trusted === undefined
    ? Promise.resolve(true)
    : Promise.resolve(util.toString(identityKey) === util.toString(trusted))
  }
  loadIdentityKey = (identifier) => {
    if (identifier === null || identifier === undefined) {
      throw new Error("Tried to get identity key for undefined/null key")
    }
    return Promise.resolve(this.get('identityKey' + identifier))
  }
  saveIdentity = (identifier, identityKey) => {
    if (identifier === null || identifier === undefined) {
      throw new Error("Tried to put identity key for undefined/null key")
    }

    const address = new libsignal.SignalProtocolAddress.fromString(identifier)

    const existing = this.get('identityKey' + address.getName())
    this.put('identityKey' + address.getName(), identityKey)

    return existing && util.toString(identityKey) !== util.toString(existing)
    ? Promise.resolve(true)
    : Promise.resolve(false)
  }

  /* Returns a prekeypair object or undefined */
  loadPreKey = async (keyId) => {
    const preKey = await this.get('25519KeypreKey' + keyId)
    const res = preKey !== undefined
    ? { pubKey: preKey.pubKey, privKey: preKey.privKey }
    : undefined
    return Promise.resolve(res)
  }
  storePreKey = (keyId, keyPair) => {
    return Promise.resolve(this.put('25519KeypreKey' + keyId, keyPair))
  }
  removePreKey = (keyId) =>
    Promise.resolve(this.remove('25519KeypreKey' + keyId))

  /* Returns a signed keypair object or undefined */
  loadSignedPreKey = async (keyId) => {
    const signedPreKey = await this.get('25519KeysignedKey' + keyId)
    const res = signedPreKey !== undefined
    ? { pubKey: signedPreKey.pubKey, privKey: signedPreKey.privKey }
    : undefined
    return Promise.resolve(res)
  }
  storeSignedPreKey = (keyId, KeyPair) =>
    Promise.resolve(this.put('25519KeysignedKey' + keyId, keyPair))
  removeSignedPreKey = (keyId) =>
    Promise.resolve(this.remove('25519KeysignedKey' + keyId))

  loadSession = (identifier) =>
    Promise.resolve(this.get('session' + identifier))
  storeSession = (identifier, record) =>
    Promise.resolve(this.put('session' + identifier, record))
  removeSession = (identifier) =>
    Promise.resolve(this.remove('session' + identifier))
  removeAllSessions = (indentifier) => {
    const matches =
      this.store.query((doc) => doc._id.startsWith('session' + identifier))
    return Promise.all(matches.map((match) => this.store.del(match._id)))
  }

}

module.exports = OrbitDBSignalProtocolStore
