
'use strict'
var util = require('./helpers.js');
var serializeKeyPair = (idKeys) => JSON.stringify(
	{ pubKey:util.toString(idKeys.pubKey), privKey:util.toString(idKeys.privKey) }
);
var deserializeKeyPair = (keyPair) => Object.keys(JSON.parse(keyPair))
	.reduce(
		(obj, key) => ({
			...obj,
			[key]: util.toArrayBuffer(JSON.parse(keyPair)[key]),
		}),
		{}
	);

function OrbitDBSignalProtocolStore(orbitDocstore) {
  this.store = orbitDocstore;
}

OrbitDBSignalProtocolStore.prototype = {
  Direction: {
    SENDING: 1,
    RECEIVING: 2,
  },

  getIdentityKeyPair: function() {
    return this.get('identityKey')
			.then((keyPair) => keyPair === undefined ? undefined : deserializeKeyPair(keyPair))
			.catch((err) => {throw err});
  },
  getLocalRegistrationId: function() {
    return this.get('registrationId');
  },
  put: function(key, value) {
    if (key === undefined || value === undefined || key === null || value === null)
      throw new Error("Tried to store undefined/null");
    return this.store.put({ _id:key, value:value });
  },
  get: function(key, defaultValue) {
    if (key === null || key === undefined)
      throw new Error("Tried to get value for undefined/null key");
		var doc = this.store.query(function(_doc) { return _doc._id === key })[0];
    if (doc !== undefined) {
      return Promise.resolve(doc.value);
    } else {
      return Promise.resolve(defaultValue);
    }
  },
  remove: function(key) {
    if (key === null || key === undefined)
      throw new Error("Tried to remove value for undefined/null key");
		return this.get(key).then(function(val) {
			if (val) {
				return this.store.del(key);
			} else {
				return Promise.resolve(true);
			}
		}.bind(this));
  },
	groupedRemove: function(docs) {
    if (docs === undefined) {
			throw new Error('docs must be defined')
		}
    return Promise.all(docs.map((doc, index) => this.remove(doc._id)));
	},

  isTrustedIdentity: function(identifier, identityKey, direction) {
    if (identifier === null || identifier === undefined) {
      throw new Error("tried to check identity key for undefined/null key");
    }
    if (!(identityKey instanceof ArrayBuffer)) {
      throw new Error("Expected identityKey to be an ArrayBuffer");
    }
    var trusted = this.get('identityKey' + identifier);
		return trusted
			.then((result) => result === undefined ? true : util.toString(identityKey) === trusted)
			.catch((err) => {throw err})
  },
  loadIdentityKey: function(identifier) {
    if (identifier === null || identifier === undefined)
      throw new Error("Tried to get identity key for undefined/null key");
    return this.get('identityKey' + identifier)
			.then((result) => result === undefined ? undefined : util.toArrayBuffer(result))
			.catch((err) => {throw err});
  },
  saveIdentity: function(identifier, identityKey) {
    if (identifier === null || identifier === undefined)
      throw new Error("Tried to put identity key for undefined/null key");

    var address = new libsignal.SignalProtocolAddress.fromString(identifier);

    var existing = this.get('identityKey' + address.getName());
    this.put('identityKey' + address.getName(), util.toString(identityKey))

		return existing
			.then((result) => 
				this.put('identityKey' + address.getName(), util.toString(identityKey))
				.then(() => result && util.toString(identityKey) !== result 
					? true
					: false
				)
				.catch((err) => {throw err})
			);
  },

  /* Returns a prekeypair object or undefined */
  loadPreKey: function(keyId) {
    var res = this.get('25519KeypreKey' + keyId);
		return res
			.then((result) => result === undefined ? undefined : deserializeKeyPair(result))
			.catch((err) => {throw err});
  },
  storePreKey: function(keyId, keyPair) {
    return this.put('25519KeypreKey' + keyId, serializeKeyPair(keyPair));
  },
  removePreKey: function(keyId) {
    return this.remove('25519KeypreKey' + keyId);
  },

  /* Returns a signed keypair object or undefined */
  loadSignedPreKey: function(keyId) {
    var res = this.get('25519KeysignedKey' + keyId);
		return res
			.then((result) => result === undefined ? undefined : deserializeKeyPair(result))
			.catch((err) => {throw err});
  },
  storeSignedPreKey: function(keyId, keyPair) {
    return this.put('25519KeysignedKey' + keyId, serializeKeyPair(keyPair));
  },
  removeSignedPreKey: function(keyId) {
    return this.remove('25519KeysignedKey' + keyId);
  },

  loadSession: function(identifier) {
    return this.get('session' + identifier);
  },
  storeSession: function(identifier, record) {
		const sessionId = 'session' + identifier
		// had to add the .then because record wasnt actually being added to store for some reason
		return this.put(sessionId, record)
			.then((hash) => this.store.query((doc) => doc._id === sessionId)[0] === undefined 
				? this.put(sessionId, record) 
				: hash
			)
			.catch((err) => {throw err});
  },
  removeSession: function(identifier) {
    return this.remove('session' + identifier);
  },
  removeAllSessions: function(identifier) {
		var sessions = this.store.query(function(doc) {
      return doc._id.startsWith('session' + identifier)
    });
    return this.groupedRemove(sessions);
  }
};

module.exports = OrbitDBSignalProtocolStore;

