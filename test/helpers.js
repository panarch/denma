// Denma Libraries.
// Taehoon Moon <panarch@kaist.ac.kr>
//
// helpers
//
// Copyright Taehoon Moon 2014

function _before(callback, db, client, models, indexes) {
    client.select(9, function() {
        db.init(client, models, indexes, function() {
            client.flushdb(callback);
        });
    });
}

function _after(callback, client) {
    client.flushdb(function(err) {
        client.quit(callback);
    });
}

module.exports = {
    _before: _before,
    _after: _after
};

