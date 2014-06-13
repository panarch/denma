// Denma Libraries.
// Taehoon Moon <panarch@kaist.ac.kr>
//
// indexes 
//
// Copyright Taehoon Moon 2014

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

module.exports = indexes;

