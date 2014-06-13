# Denma
A Nodejs Redis ORM library which resembles GAE Python datastore API.
Copyright (c) 2014 Taehoon Moon

## Installation
```
npm install denma
```

## Test
```
mocha
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

### Properties

<dl>
  <dt>StringProperty (options)</dt>
  <dd>.</dd>
  
  <dt>DateTimeProperty (options)</dt>
  <dd>Currently, two options available
    <dl>
      <dt>autoNow</dt>
      <dd>Automatically update current datetime for every time when value updated</dd>
      
      <dt>autoNowAdd</dt>
      <dd>Automatically set current datetime when value inserted at first</dd>
    </dl>
  </dd>
  
  <dt>ReferenceProperty (target, options)</dt>
  <dd>
  Unlike GAE datastore, it does not fetch referencing object automatically, only returns key object.<br/>
  </dd>
</dl>


### MIT License

