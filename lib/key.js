// Denma Libraries.
// Taehoon Moon <panarch@kaist.ac.kr>
//
// Key 
//
// Copyright Taehoon Moon 2014

var db = require('./db');

var ID_PREFIX = 'id:';
var KEY_NAME_PREFIX = 'keyname:';

var Key = function(classobject, id, keyName) {
    this.classobject = classobject;
    if (id !== undefined) {
        this.id = id;
    }
    else if (keyName !== undefined) {
        this.keyName = keyName;
    }

    this.prefix = this.classobject.objects.namespace + this.classobject.objects.classname + ':';
};

module.exports = Key;

Key.prototype.getPrefix = function() {
    return this.prefix;
};

Key.prototype.toString = function() {
    if (this.id !== undefined) {
        return this.prefix + ID_PREFIX + this.id;
    }
    
    return this.prefix + KEY_NAME_PREFIX + this.keyName;
};

Key.genId = function(classobject, callback) {
    var countKey = classobject.objects.namespace + classobject.objects.classname + ':count';
    db.client.INCR(countKey, function(err, id) {
        callback(id);
    });
};

Key.fromString = function(keyString, classobject) {
    var items = keyString.split(':');
    var namespace = items[0] + ':';
    var classname = items[1];

    var prefix = namespace + classname + ':' + items[2] + ':';
    var value = keyString.substr(prefix.length);

    if (items[2] === 'id') {
        return new Key(classobject, value);
    }
    else { // keyname
        return new Key(classobject, undefined, value);
    }
};

