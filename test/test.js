// Denma Libraries.
// Taehoon Moon <panarch@kaist.ac.kr>
//
// Test 
//
// Copyright Taehoon Moon 2014

var denma = require('../lib/denma');
var db = denma.db;
var Key = denma.Key;

var redis = require('redis');
var client = redis.createClient();

var assert = require("assert");

var models = {
    User: {
        username: db.StringProperty(),
        nickname: db.StringProperty(),
        datetime: db.DateTimeProperty(),
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
        datetime2: db.DateTimeProperty({ autoNow: true })
    }

};

var User, Category, Symbol, Test;

var indexes = [
    { User: [
        { field: 'username' }
    ]},

    { User: [
        { field: 'username' },
        { field: 'nickname' }
    ]},

    { Symbol: [
        { field: 'title' },
        { field: 'category' }
    ]},

    { Symbol: [
        { field: 'category' }
    ]}
];


before(function() { 
    it('init', function(done) {
        client.select(9, function() {
            db.init(client, models, indexes, function() {
                User = models.User;
                Category = models.Category;
                Symbol = models.Symbol;
                Test = models.Test;
                client.flushdb(done);
            });
        });
    });
});

describe('db', function() {
    describe('#put', function() {
        it('put with keyName should perform without error.', function(done) {
            var t = new Test();
            t.keyName = 'TestKeyName';
            t.test1 = 'Test1';
            t.test2 = 'Test2';
            t.put(function(err) {
                assert.equal(err, null);
                var t2 = new Test();
                t2.keyName = 'TestKeyName2';
                t2.test1 = 'Test12';
                t2.test2 = 'Test22';
                t2.put(function(err) {
                    assert.equal(err, null);
                    done();
                });
            });
        });

        it('put without id and keyName should perform without error', function(done) {
            var t = new Test();
            t.test1 = 'TestId1';
            t.test2 = 'TestId2';
            t.put(function(err) {
                assert.equal(err, null);
                var t2 = new Test();
                t2.test1 = 'TestId12';
                t2.test2 = 'TestId22';
                t2.put(function(err) {
                    assert.equal(err, null);
                    done();
                });
            });
        });
    });

    describe('#get', function() {
        it('get with a key using id should retrieve corresponding value', function(done) {
            var key = new Key(Test, 1);
            db.get(key, function(t, err) {
                assert.equal(err, null);
                assert.equal(t.test1, 'TestId1');
                assert.equal(t.test2, 'TestId2');
                done();
            });
        });

        it('get with a key using keyName should retrieve corresponding value', function(done) {
            var key = new Key(Test, undefined, 'TestKeyName');
            db.get(key, function(t, err) {
                assert.equal(err, null);
                assert.equal(t.test1, 'Test1');
                assert.equal(t.test2, 'Test2');
                done();
            });
        });
    });

    describe('#getById', function() {
        it('getById should retrieve corresponding value', function(done) {
            Test.getById(1, function(t, err) {
                assert.equal(err, null);
                assert.equal(t.test1, 'TestId1');
                assert.equal(t.test2, 'TestId2');
                done();
            });
        });
    });

    describe('#getByIds', function() {
        it('getByIds should retrieve corresponding values', function(done) {
            Test.getByIds([1, 2], function(ts, err) {
                assert.equal(err, null);
                assert.equal(ts[0].test1, 'TestId1');
                assert.equal(ts[0].test2, 'TestId2');
                assert.equal(ts[1].test1, 'TestId12');
                assert.equal(ts[1].test2, 'TestId22');
                done();
            });
        });
    });

    describe('#getByKeyName', function() {
        it('getByKeyName should retrieve corresponding value', function(done) {
            Test.getByKeyName('TestKeyName', function(t, err) {
                assert.equal(err, null);
                assert.equal(t.test1, 'Test1');
                assert.equal(t.test2, 'Test2');
                done();
            });
        });
    });

    describe('#getByKeyNames', function() {
        it('getByKeyNames should retrieve corresponding values', function(done) {
            Test.getByKeyNames(['TestKeyName', 'TestKeyName2'], function(ts, err) {
                assert.equal(err, null);
                assert.equal(ts[0].test1, 'Test1');
                assert.equal(ts[0].test2, 'Test2');
                assert.equal(ts[1].test1, 'Test12');
                assert.equal(ts[1].test2, 'Test22');
                done();
            });
        });
    });

    describe('#delete', function() {
        it('delete should perform without error', function(done) {
            var i, c = 0;
            Test.getByIds([1, 2], function(ts, err) {
                assert.equal(err, null);
                ts[0].delete(end);
                ts[1].delete(end);
            });

            Test.getByKeyNames(['TestKeyName', 'TestKeyName2'], function(ts, err) {
                assert.equal(err, null);
                ts[0].delete(end);
                ts[1].delete(end);
            });

            function end(err) {
                assert.equal(err, null);
                c++;
                if (c === 4) {
                    done();
                }
            }
        });
    });

    describe('basic', function() {
        it('Check setting value works correctly', function(done) {
            var u = new User();
            u.username = 'User1';
            u.nickname = 'Nick1';

            assert.equal(u.username, 'User1');
            assert.equal(u.nickname, 'Nick1');

            var c = new Category();
            c.keyName = 'Test';
        
            var s = new Symbol();
            s.category = c;
            assert.equal(s.category.toString(), c.key.toString());
            done();
        });

        it('Stored value without setting key should have auto-increasing id key value.', function(done) {
            var t1 = new Test();
            var t2 = new Test();
            t1.put(function(err) {
                t2.put(function(err) {
                    assert.equal(t1.key.id, 3);
                    assert.equal(t2.key.id, 4);
                    done();
                });
            });
        });

        it('After deleting value, retrieving deleted value should fail.', function(done) {
            Test.getByIds([3, 4], function(tests, err) {
                var t1 = tests[0];
                var t2 = tests[1];

                var c = 0;
                t1.delete(function(err) {
                    Test.getById(1, function(t1, err) {
                        assert.equal(t1, null);
                        c++;
                        end();
                    });
                });

                t2.delete(function(err) {
                    Test.getById(2, function(t2, err) {
                        assert.equal(t2, null);
                        c++;
                        end();
                    });
                });

                function end() {
                    if (c === 2) {
                        done();
                    }
                }
            });
        });


    });
});
