/* eslint-disable no-console */
var Pgo = require("../lib/pgo");
var db = new Pgo(process.env.PGO_TEST_DB);
var dd = require("double-done");

var doneErr = console.log;
var doneOk = dd(doneErr, db.end.bind(db));

db.connect(doneErr, () => {
  db.client(doneErr, (client, done) => {
    client.query("DROP TABLE bars", () => {
      client.query("DROP SEQUENCE bars_id_seq", () => {
        client.query("DROP TABLE foos", () => {
          client.query("DROP SEQUENCE foos_id_seq", () => {
            done();
            doneOk();
          });
        });
      });
    });
  });
});
