// Denma Libraries.
// Taehoon Moon <panarch@kaist.ac.kr>
//
// queryobject test
//
// Copyright Taehoon Moon 2014

delete require.cache[require.resolve('./models')]
delete require.cache[require.resolve('./indexes')]

var denma = require('../lib/denma');
var db = denma.db;
var Key = denma.Key;
var indexManager = denma.indexManager;

var assert = require('assert');

var models = require('./models');
var indexes = require('./indexes');
var helpers = require('./helpers');

var redis = require('redis');
var client = redis.createClient();
var User, Category, Symbol, Test;

var numUsers = 10;
var numCategories = 5;
var numSymbols = 20;

describe('queryobject', function() {
    before(function(done) {
        helpers._before(function() {
            User = models.User;
            Category = models.Category;
            Symbol = models.Symbol;
            Test = models.Test;
            beforeDone();
        }, db, client, models, indexes);

        function beforeDone() {
            indexManager.update(beforeDone2, { log: false });
        }
        
        function beforeDone2() {
            indexManager.loadIndexes(beforeDone3);
        }

        function beforeDone3() {
            var i, count = 0;
            for (i = 1; i <= numUsers; i++) {
                var u = new User();
                u.username = 'username' + i;
                u.nickname = 'nickname' + i;
                u.put(end);
            }

            for (i = 1; i <= numCategories; i++) {
                var category = new Category();
                category.title = 'category' + i;
                category.description = 'This is description of... ' + i;
                category.put(end);
            }

            for (i = 1; i <= numSymbols; i++) {
                var symbol = new Symbol();
                symbol.title = 'symbol' + i;
                symbol.category = new Key(Category, i % 5);
                symbol.put(end);
            }

            function end(err) {
                assert.equal(err, null);
                count++;
                if (count >= 35) {
                    done();
                }
            }
        }
    });

    after(function(done) {
        helpers._after(done, client);
    });

    describe('#fetch', function() {
        it('fetch all items should retrieve correctly', function(done) {
            Symbol.all().fetch(function(symbols, err) {
                assert.equal(err, null);
                assert.equal(symbols.length, numSymbols);

                for (i = 0; i < symbols.length; i++) {
                    var symbol = symbols[i];
                    var symbolId = symbol.key.id;
                    assert.equal(symbol.title, 'symbol' + symbolId);
                    var categoryKey = new Key(Category, symbolId % 5);
                    assert.equal(symbol.category.toString(), categoryKey.toString());
                }

                done();
            });
        });
    });

    describe('#count', function() {
        it('count all items test', function(done) {
            User.all().count(function(num, err) {
                assert.equal(err, null);
                assert.equal(num, numUsers);
                done();
            });
        });

    });

    describe('#random', function() {
        it('random fetch test', function(done) {
            Category.all().random(function(categories, err) {
                assert.equal(err, null);
                assert.equal(categories.length, 2);
                for (var i = 0; i < categories.length; i++) {
                    var category = categories[i];
                    categoryId = category.key.id;
                    assert.equal(category.title, 'category' + categoryId);
                }
                done();
            }, 2);
        });
    });

    describe('#filter', function() {
        it('fetch with single filter', function(done) {
            User.all().filter('username', 'username2').fetch(function(us, err) {
                assert.equal(err, null);
                assert.equal(us.length, 1);
                assert.equal(us[0].username, 'username2');
                done();
            });
        });

        it('fetch with single filter with no items should return empty', function(done) {
            User.all().filter('username', 'noname').fetch(function(us, err) {
                assert.equal(err, null);
                assert.equal(us.length, 0);
                done();
            });
        });

        it('fetch with two filters', function(done) {
            User.all().filter('username', 'username3')
                      .filter('nickname', 'nickname3').fetch(function(us, err) {
                assert.equal(err, null);
                assert.equal(us.length, 1);
                assert.equal(us[0].username, 'username3');
                assert.equal(us[0].nickname, 'nickname3');
                done();
            });
        });
    });
});

