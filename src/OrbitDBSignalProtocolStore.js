
'use strict'
var util = require('./helpers.js');

function OrbitDBSignalProtocolStore(orbitDocstore) {
  this.store = orbitDocstore;
}

OrbitDBSignalProtocolStore.prototype = {
  Direction: {
    SENDING: 1,
    RECEIVING: 2,
  },

  getIdentityKeyPair: function() {
    return Promise.resolve(this.get('identityKey'));
  },
  getLocalRegistrationId: function() {
    return Promise.resolve(this.get('registrationId'));
  },
  put: function(key, value) {
    if (key === undefined || value === undefined || key === null || value === null)
      throw new Error("Tried to store undefined/null");
    return Promise.resolve(this.store.put({ _id:key, value:value }));
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
		return Promise.resolve(this.get(key).then(function(val) {
			if (val) {
				return Promise.resolve(this.store.del(key));
			} else {
				return Promise.resolve(true);
			}
		}.bind(this)));
  },
	groupedRemove: function(docs) {
    var reducedPromises = docs.reduce(function(accu, doc) {
      return accu.then(function(promises) {
        var promise = Promise.resolve(this.remove(doc._id))
        return promise.then(function() {
          return Promise.resolve(promises.concat([promise]))
        })
      }.bind(this)).catch(function(err) {
        console.error(err)
        return Promise.resolve(promises)
      })
    }.bind(this), Promise.resolve([]))
    return Promise.resolve(
      reducedPromises.then(function(promises) {
        var completed = docs.length === promises.length
        return Promise.resolve(completed)
      })
    )
	},

  isTrustedIdentity: function(identifier, identityKey, direction) {
    if (identifier === null || identifier === undefined) {
      throw new Error("tried to check identity key for undefined/null key");
    }
    if (!(identityKey instanceof ArrayBuffer)) {
      throw new Error("Expected identityKey to be an ArrayBuffer");
    }
    var trusted = this.get('identityKey' + identifier);
    if (trusted === undefined) {
      return Promise.resolve(true);
    }
    return Promise.resolve(util.toString(identityKey) === util.toString(trusted));
  },
  loadIdentityKey: function(identifier) {
    if (identifier === null || identifier === undefined)
      throw new Error("Tried to get identity key for undefined/null key");
    return Promise.resolve(this.get('identityKey' + identifier));
  },
  saveIdentity: function(identifier, identityKey) {
    if (identifier === null || identifier === undefined)
      throw new Error("Tried to put identity key for undefined/null key");

    var address = new libsignal.SignalProtocolAddress.fromString(identifier);

    var existing = this.get('identityKey' + address.getName());
    this.put('identityKey' + address.getName(), identityKey)

    if (existing && util.toString(identityKey) !== util.toString(existing)) {
      return Promise.resolve(true);
    } else {
      return Promise.resolve(false);
    }

  },

  /* Returns a prekeypair object or undefined */
  loadPreKey: function(keyId) {
    var res = this.get('25519KeypreKey' + keyId);
    if (res !== undefined) {
      res = { pubKey: res.pubKey, privKey: res.privKey };
    }
    return Promise.resolve(res);
  },
  storePreKey: function(keyId, keyPair) {
    return Promise.resolve(this.put('25519KeypreKey' + keyId, keyPair));
  },
  removePreKey: function(keyId) {
    return Promise.resolve(this.remove('25519KeypreKey' + keyId));
  },

  /* Returns a signed keypair object or undefined */
  loadSignedPreKey: function(keyId) {
    var res = this.get('25519KeysignedKey' + keyId);
    if (res !== undefined) {
      res = { pubKey: res.pubKey, privKey: res.privKey };
    }
    return Promise.resolve(res);
  },
  storeSignedPreKey: function(keyId, keyPair) {
    return Promise.resolve(this.put('25519KeysignedKey' + keyId, keyPair));
  },
  removeSignedPreKey: function(keyId) {
    return Promise.resolve(this.remove('25519KeysignedKey' + keyId));
  },

  loadSession: function(identifier) {
    return Promise.resolve(this.get('session' + identifier));
  },
  storeSession: function(identifier, record) {
    return Promise.resolve(this.put('session' + identifier, record));
  },
  removeSession: function(identifier) {
    return Promise.resolve(this.remove('session' + identifier));
  },
  removeAllSessions: function(identifier) {
		var sessions = this.store.query(function(doc) {
      return doc._id.startsWith('session' + identifier)
    });
    return Promise.resolve(this.groupedRemove(sessions));
  }
};

module.exports = OrbitDBSignalProtocolStore;

