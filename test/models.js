// Denma Libraries.
// Taehoon Moon <panarch@kaist.ac.kr>
//
// models 
//
// Copyright Taehoon Moon 2014

var denma = require('../lib/denma');
var db = denma.db;

var models = {
    User: {
        username: db.StringProperty(),
        nickname: db.StringProperty(),
        datetime: db.DateTimeProperty({ autoNowAdd: true }),
    },

    Category: {
        title: db.StringProperty(),
        description: db.StringProperty()
    },

    Symbol: {
        title: db.StringProperty(),
        category: db.ReferenceProperty('Category')
    },
    
    Test: {
        test1: db.StringProperty(),
        test2: db.StringProperty(),
        datetime1: db.DateTimeProperty({ autoNowAdd: true }),
        datetime2: db.DateTimeProperty({ autoNow: true }),
        datetime3: db.DateTimeProperty()
    }
};

module.exports = models;

