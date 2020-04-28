/* eslint-disable no-console */
var Pgo = require("../lib/pgo");
var db = new Pgo(process.env.PGO_TEST_DB);

db.model("foo", {
  bar: db.INT4,
  baz: {
    type:         db.JSON,
    defaultValue: { a: 42, b: ["c", {}] },
  },
});

db.model("bar", {
  baz: { type: db.INT4, notNull: true },
  foo: db.FKEY("foo"),
});

db.connect(console.log, function() {
  var foo = new db.models.foo();

  foo.save(console.log, function() {
    console.log("foo saved");

    db.load.foo({ id: 1 }, console.log, function(res) {
      if(! res.length) return console.log("no records found");

      console.log(res[0]);
      db.end();
    });
  });
});
