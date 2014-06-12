// MQL Libraries.
// Taehoon Moon <panarch@kaist.ac.kr>
//
// serializer
//
// Copyright Taehoon Moon 2014

var Key = require('./key');

var serializer = {};

module.exports = serializer;

serializer.serialize = function(modelInstance) {
    var data = {};
    var fields = modelInstance.classobject.objects.fields;

    data.id = modelInstance.key.id;
    data.keyName = modelInstance.key.keyName;
    data.classname = modelInstance.classname;
    
    data.fields = [];
    data.values = [];
    for(var i = 0; i < fields.length; i++) {
        var field = fields[i];
        //data.values.push(modelInstance[field]);
        var value = modelInstance.properties[field].retrieve();
        if(value !== undefined) {
            data.fields.push(field);
            data.values.push(value);
        }
    }
    
    data = JSON.stringify(data);
    return data;
};

serializer.deserialize = function(data, models) {
    if(data === null) {
        return data;
    }

    data = JSON.parse(data);

    var classobject = models[data.classname];
    var key = new Key(classobject, data.id, data.keyName);
    var modelInstance = new classobject();
    modelInstance.key = key;

    for(var i = 0; i < data.fields.length; i++) {
        var field = data.fields[i];
        var value = data.values[i];
        modelInstance[field] = value;
    }

    return modelInstance;
};

