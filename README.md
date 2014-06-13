# Denma
A Nodejs Redis ORM library which resembles GAE Python datastore API.
Copyright (c) 2014 Taehoon Moon

## Installation
```
npm install denma
```


## Documentation
* TODO
### Basics
```
var denma = require('denma');
var db = denma.db;

var redis = require('redis');
var client = redis.createClient();

db.init(client, models, indexes, callback);
```

### Models
```
var models = {
  User: {
    username: db.StringProperty(),
    nickname: db.StringProperty(),
    datetime: db.DateTimeProperty({ autoNowAdd: true })
  },
  
  Category: {
    title: db.StringProperty()
  },
  
  Symbol: {
    title: db.StringProperty(),
    category: db.ReferenceProperty('Category')
  },
};
```

### Indexes
```
var indexes = [
  { User: [
    { field: username }
  ]},

  { User: [
    { field: username },
    { field: nickname }
  ]},
  
  { Symbol: [
    { field: title }
  ]}
]
```

### MIT License

