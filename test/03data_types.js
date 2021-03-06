"use strict";

var assert = require("assert");
var db;
var t;

var helper = require("./helper");
var cleanLogs = helper.cleanLogs;
var clean = helper.clean;
var logs = helper.logs;
var newPgo = helper.newPgo;

describe("data types", function() {
  describe("types", function() {
    before(function(done) {
      t = this;
      db = newPgo();
      db.model("test1", {
        a: db.INT2,
        b: db.INT4,
        c: db.INT8,
        d: db.VARCHAR,
        e: db.VARCHAR(20),
        f: db.JSON,
        g: {
          type: db.VARCHAR,
        },
        h: {
          type: db.VARCHAR(10),
        },
        j: db.TEXT,
      });
      db.connect(function(err) {
        t.err = err;
        done();
      });
    });

    after(function(done) {
      clean(db, done);
    });

    it("err is null", function() {
      assert.ifError(this.err);
    });

    it("nr connect == nr done", function() {
      assert.equal(helper.pgoc.connect, helper.pgoc.done);
    });

    it("15 log lines", function() {
      assert.equal(logs.length, 16);
    });

    it("ALTER TABLE test1s ADD COLUMN a int2", function() {
      assert.equal(logs[6], "ALTER TABLE test1s ADD COLUMN a int2");
    });

    it("ALTER TABLE test1s ADD COLUMN b int4", function() {
      assert.equal(logs[7], "ALTER TABLE test1s ADD COLUMN b int4");
    });

    it("ALTER TABLE test1s ADD COLUMN c int8", function() {
      assert.equal(logs[8], "ALTER TABLE test1s ADD COLUMN c int8");
    });

    it("ALTER TABLE test1s ADD COLUMN d varchar", function() {
      assert.equal(logs[9], "ALTER TABLE test1s ADD COLUMN d varchar");
    });

    it("ALTER TABLE test1s ADD COLUMN e varchar(20)", function() {
      assert.equal(logs[10], "ALTER TABLE test1s ADD COLUMN e varchar(20)");
    });

    it("ALTER TABLE test1s ADD COLUMN f json", function() {
      assert.equal(logs[11], "ALTER TABLE test1s ADD COLUMN f json");
    });

    it("ALTER TABLE test1s ADD COLUMN g varchar", function() {
      assert.equal(logs[12], "ALTER TABLE test1s ADD COLUMN g varchar");
    });

    it("ALTER TABLE test1s ADD COLUMN h varchar(10)", function() {
      assert.equal(logs[13], "ALTER TABLE test1s ADD COLUMN h varchar(10)");
    });

    it("ALTER TABLE test1s ADD COLUMN j text", function() {
      assert.equal(logs[14], "ALTER TABLE test1s ADD COLUMN j text");
    });
  });

  describe("default values", function() {
    before(function(done) {
      t = this;
      var models = function() {
        return {
          a: {
            type:         db.INT4,
            defaultValue: 3,
          },
          b: {
            type:         db.VARCHAR,
            defaultValue: "a",
          },
          c: {
            type:         db.JSON,
            defaultValue: {
              a: 3,
              b: "a",
            },
          },
          d: {
            type:         db.TEXT,
            defaultValue: "a",
          },
        };
      };
      db = newPgo();
      db.model("test1", models());
      db.connect(function(err) {
        if(err) {
          t.err = err;

          return done();
        }
        db = newPgo();
        db.model("test1", models());
        db.connect(function(err) {
          t.err = err;
          done();
        });
      });
    });

    after(function(done) {
      clean(db, done);
    });

    it("err is null", function() {
      assert.ifError(this.err);
    });

    it("nr connect == nr done", function() {
      assert.equal(helper.pgoc.connect, helper.pgoc.done);
    });

    it("19 log lines", function() {
      assert.equal(logs.length, 23);
    });

    it("ALTER TABLE test1s ALTER COLUMN a SET DEFAULT 3", function() {
      assert.equal(logs[7], "ALTER TABLE test1s ALTER COLUMN a SET DEFAULT 3");
    });

    it("UPDATE test1s SET a = 3 WHERE a IS NULL", function() {
      assert.equal(logs[8], "UPDATE test1s SET a = 3 WHERE a IS NULL");
    });

    it("ALTER TABLE test1s ALTER COLUMN b SET DEFAULT 'a'::character varying", function() {
      assert.equal(logs[11], "ALTER TABLE test1s ALTER COLUMN b SET DEFAULT 'a'::character varying");
    });

    it("ALTER TABLE test1s ALTER COLUMN c SET DEFAULT '{\"a\":3,\"b\":\"a\"}'::json", function() {
      assert.equal(logs[15], "ALTER TABLE test1s ALTER COLUMN c SET DEFAULT '{\"a\":3,\"b\":\"a\"}'::json");
    });

    it("ALTER TABLE test1s ALTER COLUMN d SET DEFAULT 'a'::text", function() {
      assert.equal(logs[19], "ALTER TABLE test1s ALTER COLUMN d SET DEFAULT 'a'::text");
    });
  });

  describe("change", function() {
    before(function(done) {
      t = this;
      db = newPgo();
      db.model("test1", {
        a: db.INT4,
        b: db.VARCHAR,
        c: db.VARCHAR,
        d: db.VARCHAR(10),
        e: db.INT4,
      });
      db.connect(function() {
        cleanLogs();
        db = newPgo();
        db.model("test1", {
          a: db.VARCHAR,
          b: db.INT4,
          c: db.VARCHAR(20),
          d: db.VARCHAR(20),
          e: db.INT2,
        });
        db.connect(function(err) {
          t.err = err;
          done();
        });
      });
    });

    after(function(done) {
      clean(db, done);
    });

    it("err is null", function() {
      assert.ifError(this.err);
    });

    it("nr connect == nr done", function() {
      assert.equal(helper.pgoc.connect, helper.pgoc.done);
    });

    it("5 log lines", function() {
      assert.equal(logs.length, 5);
    });

    it("ALTER TABLE test1s ALTER COLUMN a TYPE varchar", function() {
      assert.equal(logs[0], "ALTER TABLE test1s ALTER COLUMN a TYPE varchar");
    });

    it("ALTER TABLE test1s ALTER COLUMN b TYPE int4 USING b::int4", function() {
      assert.equal(logs[1], "ALTER TABLE test1s ALTER COLUMN b TYPE int4 USING b::int4");
    });

    it("ALTER TABLE test1s ALTER COLUMN c TYPE varchar(20)", function() {
      assert.equal(logs[2], "ALTER TABLE test1s ALTER COLUMN c TYPE varchar(20)");
    });

    it("ALTER TABLE test1s ALTER COLUMN d TYPE varchar(20)", function() {
      assert.equal(logs[3], "ALTER TABLE test1s ALTER COLUMN d TYPE varchar(20)");
    });

    it("ALTER TABLE test1s ALTER COLUMN e TYPE int2", function() {
      assert.equal(logs[4], "ALTER TABLE test1s ALTER COLUMN e TYPE int2");
    });
  });

  describe("timestamp", function() {
    before(function(done) {
      t = this;
      db = newPgo();
      db.model("test1", {
        a: db.TIMESTAMP,
        b: db.TIMESTAMP(5),
        c: {
          type:         db.TIMESTAMP,
          defaultValue: "1976-01-23 16:45 UTC",
        },
        d: {
          type:         db.TIMESTAMP,
          defaultValue: new Date("1983-10-23 16:45 UTC"),
        },
        e: {
          type:         db.TIMESTAMP,
          defaultValue: db.NOW,
        },
      });
      db.connect(function(err) {
        if(err) return done(err);
        db = newPgo();
        db.model("test1", {
          a: db.TIMESTAMP,
          b: db.TIMESTAMP(5),
          c: {
            type:         db.TIMESTAMP,
            defaultValue: "1976-01-23 16:45 UTC",
          },
          d: {
            type:         db.TIMESTAMP,
            defaultValue: new Date("1976-01-23 16:45 UTC"),
          },
          e: {
            type:         db.TIMESTAMP,
            defaultValue: db.NOW,
          },
        });
        db.connect(function(err) {
          t.err = err;
          done();
        });
      });
    });

    after(function(done) {
      clean(db, done);
    });

    it("err is null", function() {
      assert.ifError(this.err);
    });

    it("nr connect == nr done", function() {
      assert.equal(helper.pgoc.connect, helper.pgoc.done);
    });

    it("22 log lines", function() {
      assert.equal(logs.length, 22);
    });

    it("ALTER TABLE test1s ADD COLUMN a timestamptz(6)", function() {
      assert.equal(logs[6], "ALTER TABLE test1s ADD COLUMN a timestamptz(6)");
    });

    it("ALTER TABLE test1s ADD COLUMN b timestamptz(5)", function() {
      assert.equal(logs[7], "ALTER TABLE test1s ADD COLUMN b timestamptz(5)");
    });

    it("ALTER TABLE test1s ADD COLUMN c timestamptz(6)", function() {
      assert.equal(logs[8], "ALTER TABLE test1s ADD COLUMN c timestamptz(6)");
    });

    it("ALTER TABLE test1s ALTER COLUMN c SET DEFAULT '1976-01-23 16:45:00+00'::timestamptz", function() {
      assert.equal(logs[9], "ALTER TABLE test1s ALTER COLUMN c SET DEFAULT '1976-01-23 16:45:00+00'::timestamptz");
    });

    it("ALTER TABLE test1s ALTER COLUMN d SET DEFAULT '1983-10-23 16:45:00+00'::timestamptz", function() {
      assert.equal(logs[13], "ALTER TABLE test1s ALTER COLUMN d SET DEFAULT '1983-10-23 16:45:00+00'::timestamptz");
    });

    it("ALTER TABLE test1s ALTER COLUMN e SET DEFAULT CURRENT_TIMESTAMP", function() {
      assert.equal(logs[17], "ALTER TABLE test1s ALTER COLUMN e SET DEFAULT CURRENT_TIMESTAMP");
    });

    it("ALTER TABLE test1s ALTER COLUMN d SET DEFAULT '1976-01-23 16:45:00+00'::timestamptz", function() {
      assert.equal(logs[21], "ALTER TABLE test1s ALTER COLUMN d SET DEFAULT '1976-01-23 16:45:00+00'::timestamptz");
    });
  });
});
