// Denma Libraries.
// Taehoon Moon <panarch@kaist.ac.kr>
//
// db
//
// Copyright Taehoon Moon 2014

var NS = 'M:';
var db = {
    NS: NS
};

module.exports = db;

var property = require('./property');
var Key = require('./key');
var QueryObject = require('./queryobject');
var indexManager = require('./indexmanager');
var serializer = require('./serializer');


for (var prop in property) {
    db[prop] = property[prop];
}

db.get = function(key, callback) {
    db.client.GET(key.toString(), function(err, reply) {
        var m = serializer.deserialize(reply, db.models);
        callback(m, err);
    });
};

db.classFunctions = {
    get: function() {
        return function(key, callback) {
            db.client.GET(key.toString(), function(err, reply) {
                var m = serializer.deserialize(reply, db.models);
                callback(m, err);
            });
        };
    },

    getByIds: function(classobject) {
        return function(ids, callback) {
            var keys = [];
            for (var i = 0; i < ids.length; i++) {
                var id = ids[i];
                var key = new Key(classobject, id);
                keys.push(key);
            }

            db.client.MGET(keys, function(err, replies) {
                var ms = [];
                for (var i = 0; i < replies.length; i++) {
                    var reply = replies[i];
                    var m = serializer.deserialize(reply, db.models);
                    ms.push(m);
                }
                callback(ms, err);
            });
        };
    },

    getById: function(classobject) {
        return function(id, callback) {
            var key = new Key(classobject, id);

            db.client.GET(key.toString(), function(err, reply) {
                var m = serializer.deserialize(reply, db.models);
                callback(m, err);
            });
        };
    },

    getByKeyNames: function(classobject) {
        return function(keyNames, callback) {
            var keys = [];
            for (var i = 0; i < keyNames.length; i++) {
                var keyName = keyNames[i];
                var key = new Key(classobject, undefined, keyName);
                keys.push(key);
            }

            db.client.MGET(keys, function(err, replies) {
                var ms = [];
                for (var i = 0; i < replies.length; i++) {
                    var reply = replies[i];
                    var m = serializer.deserialize(reply, db.models);
                    ms.push(m);
                }
                callback(ms, err);
            });
        };
    },

    getByKeyName: function(classobject) {
        return function(keyName, callback) {
            var key = new Key(classobject, undefined, keyName);

            db.client.GET(key.toString(), function(err, reply) {
                var m = serializer.deserialize(reply, db.models);
                callback(m, err);
            });
        };
    },

    all: function(classobject) {
        return function() {
            var queryObject = new QueryObject(classobject);
            return queryObject;
        };
    }
};

db.prototypeFunctions = {
    put: function(callback) {
        function next(self) {
            var multi = db.client.MULTI();

            var serialized = serializer.serialize(self);
            multi.SET(self.key.toString(), serialized, function(err, reply) {
                if (callback !== undefined) {
                    callback(err);
                }
            });
            multi.SADD(self.key.getPrefix() + 'entities', self.key.toString());

            var indexes = indexManager.getIndexes(self.classname);
            for (var i = 0; i < indexes.length; i++) {
                var index = indexes[i].index;
                var indexKey = indexes[i].indexKey;
                var indexDataKey = indexManager.makeIndexDataKey(self, index, indexKey);
                multi.SADD(indexKey, indexDataKey);
                multi.SADD(indexDataKey, self.key.toString());
            }

            multi.EXEC(function(err, reply) {
                // all done successfully?
            });
        }

        if (this.key === undefined) {
            var self = this;
            Key.genId(this.classobject, function(id) {
                self.key = new Key(self.classobject, id);
                next(self);
            });
        }
        else {
            next(this);
        }
    },

    delete: function(callback) {
        // delete from entities, no need of updating index keys.
        var multi = db.client.multi();
        multi.DEL(this.key.toString());
        var entityKey = this.key.getPrefix() + 'entities'; 
        multi.SREM(entityKey, this.key.toString());
        multi.EXEC(function(err, reply) {
            callback(err);
        });
    }
};

db.apply = function(models) {
    var namespace = NS;

    var _self = function(model, objects) {
        return function(reply) {
            this.namespace = objects.namespace;
            this.classname = objects.classname;
            this.model = objects.model;
            this.classobject = objects.classobject;
            this.properties = {};
            objects.fields = [];

            function _getFunc(property) {
                function _get() {
                    if (property.value === undefined) {
                        console.log('not defined');
                    }

                    return property.value;
                }

                return _get;
            }

            function _setFunc(property) {
                function _set(value) {
                    property.value = value;
                }

                return _set;
            }

            var field;
            for (field in model) {
                objects.fields.push(field);
                var _property = new model[field](field);
                Object.defineProperty(this, field, {
                    get: _getFunc(_property),
                    set: _setFunc(_property)
                });
                this.properties[field] = _property;
            }

            objects.fields.sort(); // sort it. -- for serialization process.

            if (reply === undefined) {
                return;
            }

            for (field in reply) {
                //console.log('field : ' + field + ', value: ' + reply[field]);
                this[field] = reply[field];
            }
        };
    };

    function _getKey() {
        return this._key;
    }
    
    function _setKey(key) {
        this._key = key;
    }

    function _getId() {
        if (this._key === undefined ||
           (this._key !== undefined && this._key.id === undefined)) {
            console.log('id is undefined.');
            return undefined;
        }

        return this._key.id;
    }

    function _setId(id) {
        console.log('set id not available.');
    }

    function _getKeyName() {
        if (this._key === undefined ||
           (this._key !== undefined && this._key.keyName === undefined)) {
            console.log('keyName is undefined');
            return undefined;
        }

        return this._key.keyName;
    }

    function _setKeyName(keyName) {
        this._key = new Key(this.classobject, undefined, keyName);
    }

    for (var name in models) {
        var model = models[name];

        var objects = {};
        var self = _self(model, objects);

        objects.namespace = namespace;
        objects.classname = name;
        objects.model = model;
        objects.classobject = self;

        self.objects = objects;

        var functionName;
        for (functionName in db.classFunctions) {
            self[functionName] = db.classFunctions[functionName](self);
        }

        for (functionName in db.prototypeFunctions) {
            self.prototype[functionName] = db.prototypeFunctions[functionName];
        }

        Object.defineProperty(self.prototype, 'key', {
            get: _getKey,
            set: _setKey
        });

        Object.defineProperty(self.prototype, 'id', {
            get: _getId,
            set: _setId
        });

        Object.defineProperty(self.prototype, 'keyName', {
            get: _getKeyName,
            set: _setKeyName
        });


        models[name] = self;
    }

    indexManager.setModels(models);

    db.models = models;
};

db.applyIndexes = function(indexes, callback) {
    indexManager.init(callback);
    indexManager.setLocalIndexes(indexes);
};

db.init = function(client, models, indexes, callback) {
    db.client = client;
    db.apply(models);
    db.applyIndexes(indexes, callback);
};

