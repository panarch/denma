// Denma Libraries.
// Taehoon Moon <panarch@kaist.ac.kr>
//
// IndexManager
//
// Copyright Taehoon Moon 2014

var db = require('./db');
var serializer = require('./serializer');

var indexManager = {};

module.exports = indexManager;

var models;
var localIndexes;
var localIndexDict = {};

// index info from server
// put indexes per indexkey
var indexes;
var indexDict = {};
// put indexes per model key
var modelIndexDict = {};

// store after doing serializing. 
// store into set. User:firstname, User:firstname:lastname, etc.
// if inequality index -- User:firstname:lastname+asc
indexManager.init = function(callback) {
    if (callback === undefined) {
        callback = function(reply) {
        };
    }

    indexManager.loadIndexes(callback);
};

indexManager.setLocalIndexes = function(_indexes) {
    localIndexes = _indexes;
    
    // serialize
    for (var i in localIndexes) {
        var index = localIndexes[i];
        var classname = Object.keys(index)[0];
        var indexKey = db.NS + ':index:' + classname;
        
        var fields = index[classname];
        for (var j in fields) {
            var fieldDict = fields[j];
            var field = fieldDict.field;
            indexKey += ':' + field;
            // if inequality querys... 
        }

        localIndexDict[indexKey] = index;
    }
};

indexManager.setModels = function(_models) {
    models = _models;
};

indexManager.getIndexDataKeyPrefix = function() {
    return db.NS + ':indexdatakey:';
};

indexManager.getIndexPrefix = function() {
    return db.NS + ':index:';
};

indexManager.loadIndexes = function(callback) {
    // get registered indexes from server.
    db.client.SMEMBERS(db.NS + ':indexes', function(err, reply) {
        indexes = reply;
        indexManager._buildIndexDict();
        callback();
    });
};

indexManager.getIndexes = function(classname) {
    if (modelIndexDict[classname] === undefined) {
        return [];
    }
    return modelIndexDict[classname];
};

indexManager.getIndex = function(indexKey) {
    return indexDict[indexKey];
};

indexManager._buildIndexDict = function() {
    indexDict = {};
    modelIndexDict = {};

    for (var i = 0; i < indexes.length; i++) {
        var indexKey = indexes[i];
        
        var temp = indexKey.substr(indexManager.getIndexPrefix().length);
        var fields = temp.split(':');
        var classname = fields[0];
        if (modelIndexDict[classname] === undefined) {
            modelIndexDict[classname] = [];
        }

        var index = {};
        index[classname] = [];
        for (var j = 1; j < fields.length; j++) {
            index[classname].push({ field: fields[j] });
        }
        indexDict[indexKey] = index;
        modelIndexDict[classname].push({ 
            index: index,
            indexKey: indexKey
        });
    }
};

indexManager.parseIndexDataKey = function(indexDataKey) {
    var prefix = indexManager.getIndexDataKeyPrefix();

    var raw = indexDataKey.substr(prefix.length);
    var data = JSON.parse(raw);
    return data;
};

indexManager.makeIndexDataKeyUsingFilters = function(classobject, filters, indexKey) {
    var data = {
        indexKey: indexKey,
        values: []
    };

    var namespace = classobject.objects.namespace;
    var classname = classobject.objects.classname;
    for (var i = 0; i < filters.length; i++) {
        var filter = filters[i];
        data.values.push(filter.param);
    }

    if (indexDict[indexKey] === undefined) {
        console.error('Index does not exists.');
    }

    var prefix = indexManager.getIndexDataKeyPrefix();
    return prefix + JSON.stringify(data);
};

indexManager.makeIndexDataKey = function(modelInstance, index, indexKey) {
    var data = {
        indexKey: indexKey,
        values: []
    };
    
    var namespace = modelInstance.classobject.objects.namespace;
    var classname = Object.keys(index)[0];
    var fields = index[classname];
    for (var i = 0; i < fields.length; i++) {
        var value = modelInstance.properties[fields[i].field].retrieve();
        data.values.push(value);
        //data.values.push(modelInstance[fields[i].field]);
    }

    var prefix = indexManager.getIndexDataKeyPrefix();
    return prefix + JSON.stringify(data);
};

var build = function(callback, indexKey, index, namespace, options) {
    if(options.log) {
        console.log('[%s] Start building index...', indexKey);
    }

    // get entities 
    var classname = Object.keys(index)[0];
    var entityKey = namespace + classname + ':entities';
    if(options.log) {
        console.log(entityKey);
    }

    var multi = db.client.multi();
    multi.SADD(db.NS + ':indexes', indexKey);
    multi.SMEMBERS(entityKey, function(err, reply) {
        if (reply.length === 0) {
            if(options.log) {
                console.log('[%s] Finished building index!', indexKey);
            }
            callback();
            return reply;
        }

        db.client.MGET(reply, function(err, reply) {
            function _execCallback(err, reply) {
                if(options.log) {
                    console.log('[%s] Finished building index!', indexKey);
                }
                callback();
            }

            for (var i = 0; i < reply.length; i++) {
                var raw = reply[i]; // serialized
                var modelInstance = serializer.deserialize(raw, models);

                var indexDataKey = indexManager.makeIndexDataKey(modelInstance, index, indexKey);

                var multi = db.client.multi();
                //console.log('indexKey : ' + indexKey);
                //console.log('indexDataKey : ' + indexDataKey);
                multi.SADD(indexKey, indexDataKey);
                multi.SADD(indexDataKey, modelInstance.key.toString());
                
                multi.EXEC(_execCallback);
            }
        });
    });
    multi.exec(function(err, replies) {});
};

indexManager.update = function(callback, options) {
    if(options === undefined) {
        options = { log: true };
    }

    var indexKeys = Object.keys(localIndexDict);
    var i;
    var maxCount = 0;
    for (i = 0; i < indexKeys.length; i++) {
        var indexKey = indexKeys[i];
        if (indexDict[indexKey] === undefined) {
            maxCount++;
            build(end, indexKey, localIndexDict[indexKey], db.NS, options);
        }
    }

    var count = 0;
    function end() {
        count++;
        if(count >= maxCount) { 
            if(options.log) {
                console.log('Index update finished!');
            }

            callback();
        }
    }
};

indexManager.vacuum = function() {
    //TODO: ...
    indexManager.loadIndexes(function() {
        for (var i = 0; i < indexes.length; i++) {
            var index = indexes[i];
            console.log('indexes to remove');
            if (localIndexDict[index] === undefined) {
                console.log(index);
            }
        }
    });
};

