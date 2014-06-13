// Denma Libraries.
// Taehoon Moon <panarch@kaist.ac.kr>
//
// QueryObject 
//
// Copyright Taehoon Moon 2014

var db = require('./db');
var serializer = require('./serializer');
var indexManager = require('./indexmanager');

var QueryObject = function(classobject) {
    this.classobject = classobject;
    this.filters = [];
};

module.exports = QueryObject;

QueryObject.prototype.filter = function(field, param) {
    // retrive field name
    var raw = field.trim().split(' ');
    field = raw[0];
    var condition;
    if (raw.length > 1) {
        condition = raw[1]; // > < >= <=
    }
    else {
        condition = '=';
    }

    // check whether field exists in properties of classobject.
    var fieldExists = false;
    var model = this.classobject.objects.model;
    for (var modelField in model) {
        if (field === modelField) {
            fieldExists = true;
            break;
        }
    }

    if (!fieldExists) {
        console.error('field does not exists!');
        return this;
    }

    param = model[field].convert(param);

    this.filters.push({
        field: field,
        condition: condition,
        param: param
    });

    return this;
};

QueryObject.prototype.getEntityKey = function() {
    var entityKey = db.NS + this.classobject.objects.classname + ':entities';
    return entityKey;
};

QueryObject.prototype.getIndexKey = function() {
    var indexKey = db.NS + ':index:' + this.classobject.objects.classname;
    for (var i = 0; i < this.filters.length; i++) {
        indexKey += ':' + this.filters[i].field;
    }

    return indexKey;
};

QueryObject.prototype.count = function(callback, limit) {
    if (callback === undefined) {
        console.error('callback not defined');
        return;
    }

    this.fetch(function(ds, err) {
        callback(ds.length, err);
    }, limit);
};

function isProperIndex(m, filters) {
    if (!m) {
        return false;
    }

    var properIndex = true;
    for (var j = 0; j < filters.length; j++) {
        var param = filters[j].param;
        var field = filters[j].field;
        if (m.properties[field].retrieve() !== param) {
            properIndex = false;
            break;
        }
    }

    return properIndex;
}

QueryObject.prototype.random = function(callback, count) {
    if (callback === undefined) {
        console.error('callback not defined');
        return;
    }
    
    if (count === undefined) {
        count = 1;
    }
    
    // add 10%
    num = count + (count / 10 | 0) + 1;

    var dkey, indexDataKey;
    var trial = 0;
    
    if (this.filters.length === 0) {
        var entityKey = this.getEntityKey();
        dkey = entityKey;
    }
    else {
        var indexKey = this.getIndexKey();

        indexDataKey = indexManager.makeIndexDataKeyUsingFilters(this.classobject, this.filters, indexKey);
        var data = indexManager.parseIndexDataKey(indexDataKey);
        dkey = indexDataKey;
    }

    var ms = [];
    var filters = this.filters;
    
    function _run(_num) {
        db.client.SRANDMEMBER(dkey, _num, function(err, replies) {
            if (err) {
                callback(null, err);
                return;
            }

            db.client.MGET(replies, function(err, replies) {
                var ms = [];
                for (var i = 0; i < replies.length; i++) {
                    var reply = replies[i];
                    var m = serializer.deserialize(reply, db.models);

                    if (filters.length === 0) {
                        ms.push(m);
                        continue;
                    }

                    var properIndex = isProperIndex(m, filters);
                    if (properIndex) {
                        ms.push(m);
                    }
                    else {
                        db.client.SREM(indexDataKey, replies[i]);
                    }
                }

                if (ms.length >= count) {
                    callback(ms.slice(0, count), err);
                }
                else if (trial > 5) {
                    callback(ms, err);
                }
                else {
                    _num = count - ms.length;
                    _num *= 2;
                    trial++;
                    _run(_num);
                }
            });
        });
    }

    _run(num);
};

QueryObject.prototype.fetch = function(callback, limit) {
    if (callback === undefined) {
        console.error('callback not defined');
        return;
    }

    //TODO: limit is unimplemented yet.
    if (limit === undefined || limit > 1000) {
        limit = 1000;
    }

    if (this.filters.length === 0) {
        // M:User:entities
        var entityKey = this.getEntityKey();
        db.client.SMEMBERS(entityKey, function(err, replies) {
            if (replies.length === 0) {
                callback([], err);
                return;
            }

            db.client.MGET(replies, function(err, replies) {
                var ms = [];
                for (var i = 0; i < replies.length; i++) {
                    var reply = replies[i];
                    var m = serializer.deserialize(reply, db.models);
                    ms.push(m);
                }

                callback(ms, err);
            });
        });
        return;
    }

    // M::index:User:firstname:lastname
    var indexKey = this.getIndexKey();

    var indexDataKey = indexManager.makeIndexDataKeyUsingFilters(this.classobject, this.filters, indexKey);
    var data = indexManager.parseIndexDataKey(indexDataKey);
    var filters = this.filters;
    db.client.SMEMBERS(indexDataKey, function(err, replies) {
        var modelKeys = replies;
        if (modelKeys.length === 0) {
            callback(modelKeys, err);
            return;
        }

        db.client.MGET(modelKeys, function(err, replies) {
            var ms = [];
            for (var i = 0; i < replies.length; i++) {
                var reply = replies[i];
                var m = serializer.deserialize(reply, db.models);
                // if m matchs current index
                // if not delete this from indexDataKey set.
                var properIndex = isProperIndex(m, filters);
                if (properIndex) {
                    ms.push(m);
                }
                else {
                    db.client.SREM(indexDataKey, modelKeys[i]);
                }
            }

            callback(ms, err);
        });
    });
};

