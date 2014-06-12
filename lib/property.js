// MQL Libraries.
// Taehoon Moon <panarch@kaist.ac.kr>
//
// Property
//
// Copyright Taehoon Moon 2014

var Key = require('./key'); 
var db = require('./db');

var property = {};

module.exports = property;

property.StringProperty = function(options) {
    if(options === undefined) {
        options = {};
    }

    function StringProperty(field) {
        this.field = field;
        this.classname = 'StringProperty';
        this.classobject = StringProperty;
    }

    StringProperty.convert = function(param) {
        if(typeof param === 'string') {
            return param;
        }
        else {
            return param.toString();
        }
    };

    StringProperty.prototype = {
        validate: function() {
            if(options.required && this.value === undefined) {
                console.error('value required');
                // throw needed.
                return false;
            }
            return true;
        },

        retrieve: function() {
            var value = this.value;
            if(options.isPassword) {
                // encrypt value
            }
            
            return value;
        }
    };

    return StringProperty;
};

property.DateTimeProperty = function(options) {
    if(options === undefined) {
        options = {};
    }

    function DateTimeProperty(field) {
        this.field = field;
        this.classname = 'DateTimeProperty';
        this.classobject = DateTimeProperty;
    }

    DateTimeProperty.convert = function(param) {
        if(typeof param === 'string') {
            return param;
        }
        else if(typeof param === 'object') {
            return param.getTime();
        }
        else {
            console.error('does not allow other types.');
        }
    };

    DateTimeProperty.prototype = {
        validate: function() {

        },

        retrieve: function() {
            if(options.autoNowAdd) {
                if(!this._value) {
                    this._value = new Date();
                }
            }
            else if(options.autoNow) {
                this._value = new Date();
            }

            if(this._value !== undefined) {
                return this._value.getTime();
            }
            return this._value;
        }
    };

    Object.defineProperty(DateTimeProperty.prototype, 'value', {
        get: function() {
            return this._value;
        },

        set: function(value) {
            if(typeof value !== 'object') {
                value = new Date(value);
            }
            this._value = value;
        }
    });

    return DateTimeProperty;
};

property.ReferenceProperty = function(target, options) {
    // Unlike Google Datastore, it stores Key instance instead of auto-retrieiving referencing object.
    if(target === undefined) {
        console.error('Target undefined error');
        return;
    }
    
    if(options === undefined) {
        options = {};
    }

    function ReferenceProperty(field) {
        this.field = field;
        this.classname = 'ReferenceProperty';
        this.classobject = ReferenceProperty;
    }

    ReferenceProperty.convert = function(param) {
        if(typeof param === 'string') {
            return param;
        }
        else if(param.key === undefined) {
            return param.toString();
        }
        else {
            return param.key.toString();
        }
    };

    ReferenceProperty.prototype = {
        validate: function() {

        },

        retrieve: function() {
            return this._value.toString();
        }
    };

    Object.defineProperty(ReferenceProperty.prototype, 'value', {
        get: function() {
            return this._value;
        },

        set: function(value) {
            if(typeof value === 'object') {
                if(value.key !== undefined) {
                    this._value = value.key;
                }
                else {
                    this._value = value;
                }
            }
            else if(typeof value === 'string') {
                var classobject = db.models[target].objects.classobject;
                this._value = Key.fromString(value, classobject);
            }
            else {
                console.error('Other type is not allowed.');
            }
        }
    });

    return ReferenceProperty;
};

