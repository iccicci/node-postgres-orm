/* jshint mocha: true */
"use strict";

var assert = require("assert");
var db;
var t;

var helper    = require("./helper");
var cleanLogs = helper.cleanLogs;
var clean     = helper.clean;
var logs      = helper.logs;
var newPgo    = helper.newPgo;

describe("schema sync", function() {
	before(function(done) {
		db = newPgo();
		db.connect(function() { clean(db, done); });
	});

	describe("CREATE TABLE", function() {
		before(function(done) {
			t  = this;
			db = newPgo();
			db.model("test1", {});
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

		it("7 log lines", function() {
			assert.equal(logs.length, 7);
		});

		it("CREATE SEQUENCE test1s_id_seq", function() {
			assert.equal(logs[0], "CREATE SEQUENCE test1s_id_seq");
		});

		it("CREATE TABLE test1s ()", function() {
			assert.equal(logs[1], "CREATE TABLE test1s ()");
		});

		it("ALTER TABLE test1s ADD COLUMN id int8", function() {
			assert.equal(logs[2], "ALTER TABLE test1s ADD COLUMN id int8");
		});

		it("UPDATE test1s SET id = nextval('test1s_id_seq'::regclass) WHERE id IS NULL", function() {
			assert.equal(logs[3], "UPDATE test1s SET id = nextval('test1s_id_seq'::regclass) WHERE id IS NULL");
		});

		it("ALTER TABLE test1s ALTER COLUMN id SET NOT NULL", function() {
			assert.equal(logs[4], "ALTER TABLE test1s ALTER COLUMN id SET NOT NULL");
		});

		it("ALTER TABLE test1s ALTER COLUMN id SET DEFAULT nextval('test1s_id_seq'::regclass)", function() {
			assert.equal(logs[5], "ALTER TABLE test1s ALTER COLUMN id SET DEFAULT nextval('test1s_id_seq'::regclass)");
		});

		it("ALTER TABLE test1s ADD CONSTRAINT test1_id_unique UNIQUE(id)", function() {
			assert.equal(logs[6], "ALTER TABLE test1s ADD CONSTRAINT test1_id_unique UNIQUE(id)");
		});
	});

	describe("CREATE TABLE already exists", function() {
		before(function(done) {
			t  = this;
			db = newPgo();
			db.model("test1", {});
			db.connect(function() {
				cleanLogs();
				db = newPgo();
				db.model("test1", {});
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

		it("0 log lines", function() {
			assert.equal(logs.length, 0);
		});
	});

	describe("DROP & CREATE TABLE add parent", function() {
		before(function(done) {
			t  = this;
			db = newPgo();
			db.model("test1", {});
			db.model("test2", {});
			db.connect(function() {
				cleanLogs();
				db = newPgo();
				db.model("test1", {});
				db.model("test2", {}, {parent: "test1"});
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

		it("2 log lines", function() {
			assert.equal(logs.length, 2);
		});

		it("DROP TABLE test2s CASCADE", function() {
			assert.equal(logs[0], "DROP TABLE test2s CASCADE");
		});

		it("CREATE TABLE test2s () INHERITS (test1s)", function() {
			assert.equal(logs[1], "CREATE TABLE test2s () INHERITS (test1s)");
		});
	});

	describe("DROP & CREATE TABLE remove parent", function() {
		before(function(done) {
			t  = this;
			db = newPgo();
			db.model("test1", {});
			db.model("test2", {}, {parent: "test1"});
			db.connect(function() {
				cleanLogs();
				db = newPgo();
				db.model("test1", {});
				db.model("test2", {});
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

		it("8 log lines", function() {
			assert.equal(logs.length, 8);
		});
	});

	describe("ADD COLUMN", function() {
		before(function(done) {
			t  = this;
			db = newPgo();
			db.model("test1", {a: db.INT4});
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

		it("8 log lines", function() {
			assert.equal(logs.length, 8);
		});

		it("ALTER TABLE test1s ADD COLUMN a int4", function() {
			assert.equal(logs[6], "ALTER TABLE test1s ADD COLUMN a int4");
		});
	});

	describe("DROP COLUMN", function() {
		before(function(done) {
			t  = this;
			db = newPgo();
			db.model("test1", {a: db.INT4});
			db.connect(function() {
				cleanLogs();
				db = newPgo();
				db.model("test1", {});
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

		it("1 log lines", function() {
			assert.equal(logs.length, 1);
		});

		it("ALTER TABLE test1s DROP COLUMN a CASCADE", function() {
			assert.equal(logs[0], "ALTER TABLE test1s DROP COLUMN a CASCADE");
		});
	});

	describe("NULL CONSTRAINT", function() {
		before(function(done) {
			t  = this;
			db = newPgo();
			db.model("test1", {a: {type: db.INT4, notNull: true}});
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

		it("9 log lines", function() {
			assert.equal(logs.length, 9);
		});

		it("ALTER TABLE test1s ALTER COLUMN a SET NOT NULL", function() {
			assert.equal(logs[7], "ALTER TABLE test1s ALTER COLUMN a SET NOT NULL");
		});
	});

	describe("DROP NULL CONSTRAINT", function() {
		before(function(done) {
			t  = this;
			db = newPgo();
			db.model("test1", {a: {type: db.INT4, notNull: true}});
			db.connect(function() {
				cleanLogs();
				db = newPgo();
				db.model("test1", {a: db.INT4});
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

		it("1 log lines", function() {
			assert.equal(logs.length, 1);
		});

		it("ALTER TABLE test1s ALTER COLUMN a DROP NOT NULL", function() {
			assert.equal(logs[0], "ALTER TABLE test1s ALTER COLUMN a DROP NOT NULL");
		});
	});

	describe("DROP DEFAULT", function() {
		before(function(done) {
			t  = this;
			db = newPgo();
			db.model("test1", {a: {type: db.INT4, defaultValue: 8}});
			db.connect(function() {
				cleanLogs();
				db = newPgo();
				db.model("test1", {a: db.INT4});
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

		it("2 log lines", function() {
			assert.equal(logs.length, 2);
		});

		it("ALTER TABLE test1s ALTER COLUMN a DROP NOT NULL", function() {
			assert.equal(logs[0], "ALTER TABLE test1s ALTER COLUMN a DROP NOT NULL");
		});

		it("ALTER TABLE test1s ALTER COLUMN a DROP DEFAULT", function() {
			assert.equal(logs[1], "ALTER TABLE test1s ALTER COLUMN a DROP DEFAULT");
		});
	});

	describe("UNIQUE CONSTRAINT", function() {
		before(function(done) {
			t  = this;
			db = newPgo();
			db.model("test1", {a: {type: db.INT4, unique: true}});
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

		it("9 log lines", function() {
			assert.equal(logs.length, 9);
		});

		it("ALTER TABLE test1s ADD CONSTRAINT test1_id_unique UNIQUE(id)", function() {
			assert.equal(logs[7], "ALTER TABLE test1s ADD CONSTRAINT test1_id_unique UNIQUE(id)");
		});
	});

	describe("DROP UNIQUE CONSTRAINT", function() {
		before(function(done) {
			t  = this;
			db = newPgo();
			db.model("test1", {a: {type: db.INT4, unique: true}});
			db.connect(function() {
				cleanLogs();
				db = newPgo();
				db.model("test1", {a: db.INT4});
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

		it("1 log lines", function() {
			assert.equal(logs.length, 1);
		});

		it("ALTER TABLE test1s DROP CONSTRAINT test1_a_unique", function() {
			assert.equal(logs[0], "ALTER TABLE test1s DROP CONSTRAINT test1_a_unique");
		});
	});

	describe("FOREING KEY", function() {
		before(function(done) {
			t  = this;
			db = newPgo();
			db.model("test1", {});
			db.model("test2", {a: db.FKEY("test1")});
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

		it("17 log lines", function() {
			assert.equal(logs.length, 17);
		});

		it("ALTER TABLE test2s ALTER COLUMN a SET NOT NULL", function() {
			assert.equal(logs[14], "ALTER TABLE test2s ALTER COLUMN a SET NOT NULL");
		});

		it("ALTER TABLE test2s ADD CONSTRAINT test2_a_fkey FOREIGN KEY (a) REFERENCES test1s (id)", function() {
			assert.equal(logs[16], "ALTER TABLE test2s ADD CONSTRAINT test2_a_fkey FOREIGN KEY (a) REFERENCES test1s (id)");
		});
	});

	describe("DROP FOREING KEY", function() {
		before(function(done) {
			t  = this;
			db = newPgo();
			db.model("test1", {});
			db.model("test2", {a: db.FKEY("test1")});
			db.connect(function() {
				cleanLogs();
				db = newPgo();
				db.model("test1", {});
				db.model("test2", {a: db.INT8});
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

		it("2 log lines", function() {
			assert.equal(logs.length, 2);
		});

		it("ALTER TABLE test2s DROP CONSTRAINT test2_a_fkey", function() {
			assert.equal(logs[0], "ALTER TABLE test2s DROP CONSTRAINT test2_a_fkey");
		});

		it("ALTER TABLE test2s ALTER COLUMN a DROP NOT NULL", function() {
			assert.equal(logs[1], "ALTER TABLE test2s ALTER COLUMN a DROP NOT NULL");
		});
	});

	describe("CREATE INDEX", function() {
		before(function(done) {
			t  = this;
			db = newPgo();
			db.model("test1", {
				a: {type: db.INT4, unique: true},
				b: {type: db.INT4, unique: true},
				c: db.INT4
			}, {
				index: [
					{
						fields: "a",
						type: "hash"
					},
					"b",
					{fields: ["a", "b"]},
					["a", "c"]
				]
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
			assert.equal(logs.length, 15);
		});

		it("CREATE INDEX ON test1s USING hash (a)", function() {
			assert.equal(logs[12], "CREATE INDEX ON test1s USING hash (a)");
		});

		it("CREATE INDEX ON test1s USING btree (a, b)", function() {
			assert.equal(logs[13], "CREATE INDEX ON test1s USING btree (a, b)");
		});

		it("CREATE INDEX ON test1s USING btree (a, c)", function() {
			assert.equal(logs[14], "CREATE INDEX ON test1s USING btree (a, c)");
		});
	});

	describe("DROP INDEX", function() {
		before(function(done) {
			t  = this;
			db = newPgo();
			db.model("test1", {
				a: {type: db.INT4, unique: true},
				b: {type: db.INT4, unique: true},
				c: db.INT4
			}, {
				index: [
					{
						fields: "a",
						type: "hash"
					},
					"b",
					{fields: ["a", "b"]},
					["a", "c"]
				]
			});
			db.connect(function() {
				cleanLogs();
				db = newPgo();
				db.model("test1", {
					a: {type: db.INT4, unique: true},
					b: {type: db.INT4, unique: true},
					c: db.INT4
				}, {
					index: [
						"a",
						"b",
						["a", "c"]
					]
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

		it("2 log lines", function() {
			assert.equal(logs.length, 2);
		});

		it("DROP INDEX test1s_a_b_idx", function() {
			assert.equal(logs[0], "DROP INDEX test1s_a_b_idx");
		});

		it("DROP INDEX test1s_a_idx", function() {
			assert.equal(logs[1], "DROP INDEX test1s_a_idx");
		});
	});
});
