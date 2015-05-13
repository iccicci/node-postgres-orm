/* jshint mocha: true */
"use strict";

var assert = require("assert");
var db;
var t;

var helper = require("./helper");
var cleanLogs = helper.cleanLogs;
var clean = helper.clean;
var logs = helper.logs;
var newPgo = helper.newPgo;

var pg = require("pg");
var oldConnect = pg.connect;

var er = 1;
var errors = {
	"SELECT currval('test1s_id_seq')": 1002,
	"ALTER TABLE test1s ALTER COLUMN a TYPE int2": 1003,
	"ALTER TABLE test1s ADD COLUMN id int8": 1004,
	"SELECT oid FROM pg_class WHERE relname = $1": 1005,
	"SELECT relname, attname, amname FROM pg_class, pg_index, pg_attribute, pg_am WHERE indrelid = $1 AND indexrelid = pg_class.oid AND attrelid = pg_class.oid AND relam = pg_am.oid ORDER BY relname": 1006,
	"CREATE INDEX ON test1s USING btree (b)": 1007,
	"CREATE TABLE test1s ()": 1008,
	"CREATE SEQUENCE test1s_id_seq": 1009,
	"SELECT conname FROM pg_attribute, pg_constraint WHERE attrelid = $1 AND conrelid = $1 AND attnum = conkey[1] AND (contype <> $2 or attname <> $3)": 1010,
	"SELECT conindid FROM pg_attribute, pg_constraint WHERE attrelid = $1 AND conrelid = $1 AND attnum = conkey[1]": 1011,
	"ALTER TABLE test1s DROP CONSTRAINT test1_a_unique": 1012,
	"SELECT * FROM pg_type, pg_attribute LEFT JOIN pg_attrdef ON adrelid = attrelid AND adnum = attnum WHERE attrelid = $1 AND attnum > 0 AND atttypid = pg_type.oid AND attislocal = 't' AND attname = $2": 1013,
	"ALTER TABLE test1s DROP COLUMN b CASCADE": 1014,
	"DROP INDEX test1s_b_idx": 1015,
	"DROP TABLE test2s CASCADE": 1016,
	"ALTER TABLE test1s ADD CONSTRAINT test1_id_unique UNIQUE(id)": 1017,
	"ALTER TABLE test1s ALTER COLUMN id SET DEFAULT nextval('test1s_id_seq'::regclass)": 1018,
	"ALTER TABLE test1s ALTER COLUMN id SET NOT NULL": 1019,
	"SELECT inhparent FROM pg_inherits WHERE inhrelid = $1": 1020,
	"UPDATE test1s SET id = nextval('test1s_id_seq'::regclass) WHERE id IS NULL": 1021,
	"SELECT attname FROM pg_attribute WHERE attrelid = $1 AND attnum > 0 AND attisdropped = false": 1022,
	"SELECT attname FROM pg_attribute, pg_constraint WHERE attrelid = $1 AND conrelid = $1 AND attnum = conkey[1] AND attname = $2": 1023,
	"SELECT relname, attname FROM pg_class, pg_index, pg_attribute, pg_am WHERE indrelid = $1 AND indexrelid = pg_class.oid AND attrelid = pg_class.oid AND relam = pg_am.oid AND amname = $2 ORDER BY relname": 1024,

	// post sync errors
	"SELECT tableoid, * FROM test2s WHERE id IN ($1)": -2,
	"BEGIN": -3,

	// not related to tests
	"SELECT conname FROM pg_attribute, pg_constraint WHERE attrelid = $1 AND conrelid = $1 AND attnum = conkey[1] AND (contype <> $2 or attname <> $3) AND (contype <> $4 or attname <> $5)": -1,
	"ALTER TABLE test1s ADD COLUMN a int4": -1,
	"ALTER TABLE test1s ADD COLUMN b int4": -1,
	"ALTER TABLE test1s ADD CONSTRAINT test1_a_unique UNIQUE(a)": -1,
	"DROP SEQUENCE test1s_id_seq CASCADE": -1,
	"DROP TABLE test1s CASCADE": -1,
	"DROP SEQUENCE test2s_id_seq CASCADE": -1,
	"DROP TABLE test3s CASCADE": -1,
	"SELECT currval('test2s_id_seq')": -1,
	"CREATE SEQUENCE test2s_id_seq": -1,
	"CREATE TABLE test2s ()": -1,
	"ALTER TABLE test2s ADD COLUMN id int8": -1,
	"UPDATE test2s SET id = nextval('test2s_id_seq'::regclass) WHERE id IS NULL": -1,
	"ALTER TABLE test2s ALTER COLUMN id SET NOT NULL": -1,
	"ALTER TABLE test2s ALTER COLUMN id SET DEFAULT nextval('test2s_id_seq'::regclass)": -1,
	"ALTER TABLE test2s ADD CONSTRAINT test2_id_unique UNIQUE(id)": -1,
	"SELECT relname, attname, amname FROM pg_class, pg_index, pg_attribute, pg_am WHERE indrelid = $1 AND indexrelid = pg_class.oid AND attrelid = pg_class.oid AND relam = pg_am.oid AND indexrelid <> $2 ORDER BY relname": -1,
	"CREATE TABLE test2s () INHERITS (test1s)": -1,
	"SELECT conname FROM pg_attribute, pg_constraint WHERE attrelid = $1 AND conrelid = $1 AND attnum = conkey[1]": -1,
	"ALTER TABLE test2s ADD COLUMN b int4": -1,
	"SELECT nextval('test1s_id_seq')": -1,
	"INSERT INTO test2s DEFAULT VALUES RETURNING *": -1,
	"SELECT tableoid, * FROM test1s WHERE id = $1": -1,
	"ALTER TABLE test1s ADD COLUMN a timestamptz(6)": -1,
	"SELECT 'test test test'::timestamp with time zone::character varying": -1,
};

describe("errors", function() {
	before(function() {
		pg.connect = function(db, cbk, a, b, c) {
			return oldConnect.call(pg, db, function(err, client, done) {
				var oldQuery = client.query;
				var newDone = function() {
					client.query = oldQuery;
					done();
				};

				client.query = function(q, p, c) {
					if(! errors[q])
						console.log(q);

					if(er == 1001 && errors[q] == 1002)
						return c(null, true);

					if(errors[q] == er)
						return c({
							code: "test"
						}, null);

					oldQuery.call(client, q, p, c);
				};

				cbk(err, client, newDone);
			}, a, b, c);
		};
	});

	after(function() {
		pg.connect = oldConnect;
	});

	describe("2", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			db.model("test1", {
				a: db.INT4
			});
			db.model("test2", {
				a: db.INT2
			}, {
				parent: "test1"
			});
			db.connect(function(err) {
				t.err = err;
				done();
			});
		});

		after(function(done) {
			clean(db, done);
		});

		it("err.pgo.code is 2", function() {
			assert.equal(this.err.pgo.code, 2);
		});

		it("err.pgo.field is a", function() {
			assert.equal(this.err.pgo.field, "a");
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});
	});

	describe("1001", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			er = 1001;
			db.model("test1", {});
			db.connect(function(err) {
				t.err = err;
				done();
			});
		});

		after(function(done) {
			clean(db, done);
		});

		it("err.pgo.code is 1001", function() {
			assert.equal(this.err.pgo.code, 1001);
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});
	});

	describe("1002", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			er = 1002;
			db.model("test1", {});
			db.connect(function(err) {
				t.err = err;
				done();
			});
		});

		after(function(done) {
			clean(db, done);
		});

		it("err.pgo.code is 1002", function() {
			assert.equal(this.err.pgo.code, 1002);
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});
	});

	describe("1003", function() {
		before(function(done) {
			t = this;
			er = 1003;
			db = newPgo();
			db.model("test1", {
				a: {
					type: db.INT4,
					unique: true
				},
				b: db.INT4,
			}, {
				index: [
					"a"
				]
			});
			db.model("test2", {});
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				cleanLogs();
				db = newPgo();
				db.model("test1", {
					a: db.INT2
				});
				db.model("test2", {}, {
					parent: "test1"
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

		it("err.pgo.code is 1003", function() {
			assert.equal(this.err.pgo.code, 1003);
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});
	});

	describe("1004", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			er = 1004;
			db.model("test1", {});
			db.connect(function(err) {
				t.err = err;
				done();
			});
		});

		after(function(done) {
			clean(db, done);
		});

		it("err.pgo.code is 1004", function() {
			assert.equal(this.err.pgo.code, 1004);
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});
	});

	describe("1005", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			er = 1005;
			db.model("test1", {});
			db.connect(function(err) {
				t.err = err;
				done();
			});
		});

		after(function(done) {
			clean(db, done);
		});

		it("err.pgo.code is 1005", function() {
			assert.equal(this.err.pgo.code, 1005);
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});
	});

	describe("1006", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			er = 1006;
			db.model("test1", {});
			db.connect(function(err) {
				t.err = err;
				done();
			});
		});

		after(function(done) {
			clean(db, done);
		});

		it("err.pgo.code is 1006", function() {
			assert.equal(this.err.pgo.code, 1006);
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});
	});

	describe("1007", function() {
		before(function(done) {
			t = this;
			er = 1007;
			db = newPgo();
			db.model("test1", {
				a: {
					type: db.INT4,
					unique: true
				},
				b: db.INT4,
			}, {
				index: [
					"b"
				]
			});
			db.model("test2", {});
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				cleanLogs();
				db = newPgo();
				db.model("test1", {
					a: db.INT2
				});
				db.model("test2", {}, {
					parent: "test1"
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

		it("err.pgo.code is 1007", function() {
			assert.equal(this.err.pgo.code, 1007);
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});
	});

	describe("1008", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			er = 1008;
			db.model("test1", {});
			db.connect(function(err) {
				t.err = err;
				done();
			});
		});

		after(function(done) {
			clean(db, done);
		});

		it("err.pgo.code is 1008", function() {
			assert.equal(this.err.pgo.code, 1008);
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});
	});

	describe("1009", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			er = 1009;
			db.model("test1", {});
			db.connect(function(err) {
				t.err = err;
				done();
			});
		});

		after(function(done) {
			clean(db, done);
		});

		it("err.pgo.code is 1009", function() {
			assert.equal(this.err.pgo.code, 1009);
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});
	});

	describe("1010", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			er = 1010;
			db.model("test1", {});
			db.connect(function(err) {
				t.err = err;
				done();
			});
		});

		after(function(done) {
			clean(db, done);
		});

		it("err.pgo.code is 1010", function() {
			assert.equal(this.err.pgo.code, 1010);
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});
	});

	describe("1011", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			er = 1011;
			db.model("test1", {});
			db.connect(function(err) {
				t.err = err;
				done();
			});
		});

		after(function(done) {
			clean(db, done);
		});

		it("err.pgo.code is 1011", function() {
			assert.equal(this.err.pgo.code, 1011);
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});
	});

	describe("1012", function() {
		before(function(done) {
			t = this;
			er = 1012;
			db = newPgo();
			db.model("test1", {
				a: {
					type: db.INT4,
					unique: true
				},
				b: db.INT4,
			}, {
				index: [
					"a"
				]
			});
			db.model("test2", {});
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				cleanLogs();
				db = newPgo();
				db.model("test1", {
					a: db.INT2
				});
				db.model("test2", {}, {
					parent: "test1"
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

		it("err.pgo.code is 1012", function() {
			assert.equal(this.err.pgo.code, 1012);
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});
	});

	describe("1013", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			er = 1013;
			db.model("test1", {});
			db.connect(function(err) {
				t.err = err;
				done();
			});
		});

		after(function(done) {
			clean(db, done);
		});

		it("err.pgo.code is 1013", function() {
			assert.equal(this.err.pgo.code, 1013);
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});
	});

	describe("1014", function() {
		before(function(done) {
			t = this;
			er = 1014;
			db = newPgo();
			db.model("test1", {
				a: {
					type: db.INT4,
					unique: true
				},
				b: db.INT4,
			}, {
				index: [
					"a"
				]
			});
			db.model("test2", {});
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				cleanLogs();
				db = newPgo();
				db.model("test1", {
					a: db.INT2
				});
				db.model("test2", {}, {
					parent: "test1"
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

		it("err.pgo.code is 1014", function() {
			assert.equal(this.err.pgo.code, 1014);
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});
	});

	describe("1015", function() {
		before(function(done) {
			t = this;
			er = 1015;
			db = newPgo();
			db.model("test1", {
				a: {
					type: db.INT4,
					unique: true
				},
				b: db.INT4,
			}, {
				index: [
					"b"
				]
			});
			db.model("test2", {});
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				cleanLogs();
				db = newPgo();
				db.model("test1", {
					a: db.INT2
				});
				db.model("test2", {}, {
					parent: "test1"
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

		it("err.pgo.code is 1015", function() {
			assert.equal(this.err.pgo.code, 1015);
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});
	});

	describe("1016", function() {
		before(function(done) {
			t = this;
			er = 1016;
			db = newPgo();
			db.model("test1", {
				a: {
					type: db.INT4,
					unique: true
				},
				b: db.INT4,
			}, {
				index: [
					"b"
				]
			});
			db.model("test2", {});
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				cleanLogs();
				db = newPgo();
				db.model("test1", {
					a: db.INT2
				});
				db.model("test2", {}, {
					parent: "test1"
				});
				db.connect(function(err) {
					er = -2;
					t.err = err;
					done();
				});
			});
		});

		after(function(done) {
			clean(db, done);
		});

		it("err.pgo.code is 1016", function() {
			assert.equal(this.err.pgo.code, 1016);
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});
	});

	describe("1017", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			er = 1017;
			db.model("test1", {});
			db.connect(function(err) {
				t.err = err;
				done();
			});
		});

		after(function(done) {
			clean(db, done);
		});

		it("err.pgo.code is 1017", function() {
			assert.equal(this.err.pgo.code, 1017);
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});
	});

	describe("1018", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			er = 1018;
			db.model("test1", {});
			db.connect(function(err) {
				t.err = err;
				done();
			});
		});

		after(function(done) {
			clean(db, done);
		});

		it("err.pgo.code is 1018", function() {
			assert.equal(this.err.pgo.code, 1018);
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});
	});

	describe("1019", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			er = 1019;
			db.model("test1", {});
			db.connect(function(err) {
				t.err = err;
				done();
			});
		});

		after(function(done) {
			clean(db, done);
		});

		it("err.pgo.code is 1019", function() {
			assert.equal(this.err.pgo.code, 1019);
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});
	});

	describe("1020", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			er = 1020;
			db.model("test1", {});
			db.connect(function(err) {
				t.err = err;
				done();
			});
		});

		after(function(done) {
			clean(db, done);
		});

		it("err.pgo.code is 1020", function() {
			assert.equal(this.err.pgo.code, 1020);
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});
	});

	describe("1021", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			er = 1021;
			db.model("test1", {});
			db.connect(function(err) {
				t.err = err;
				done();
			});
		});

		after(function(done) {
			clean(db, done);
		});

		it("err.pgo.code is 1021", function() {
			assert.equal(this.err.pgo.code, 1021);
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});
	});

	describe("1022", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			er = 1022;
			db.model("test1", {});
			db.connect(function(err) {
				t.err = err;
				done();
			});
		});

		after(function(done) {
			clean(db, done);
		});

		it("err.pgo.code is 1022", function() {
			assert.equal(this.err.pgo.code, 1022);
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});
	});

	describe("1023", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			er = 1023;
			db.model("test1", {});
			db.connect(function(err) {
				t.err = err;
				done();
			});
		});

		after(function(done) {
			clean(db, done);
		});

		it("err.pgo.code is 1023", function() {
			assert.equal(this.err.pgo.code, 1023);
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});
	});

	describe("1024", function() {
		before(function(done) {
			t = this;
			er = 1024;
			db = newPgo();
			db.model("test1", {
				a: {
					type: db.INT4,
					unique: true
				},
				b: db.INT4,
			}, {
				index: [
					"a"
				]
			});
			db.model("test2", {});
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				cleanLogs();
				db = newPgo();
				db.model("test1", {
					a: db.INT2
				});
				db.model("test2", {}, {
					parent: "test1"
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

		it("err.pgo.code is 1024", function() {
			assert.equal(this.err.pgo.code, 1024);
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});
	});

	describe("inheritance true load error", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			er = -2;
			db.model("test1", {
				a: db.INT4,
			});
			db.model("test2", {
				b: db.INT4,
			}, {
				parent: "test1",
			});
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				cleanLogs();
				var tmp = new db.models.test2();
				tmp.save(function(err) {
					t.err = err;
					if(err)
						return done();
					db.load.test1({
						id: 1
					}, function(err, res) {
						t.err = err;
						t.res = res;
						done();
					});
				});
			});
		});

		after(function(done) {
			clean(db, done);
		});

		it("err is test", function() {
			assert.equal(this.err.code, "test");
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});
	});

	describe("1025", function() {
		before(function(done) {
			t = this;
			er = 1025;
			db = newPgo();
			db.model("test1", {
				a: {
					type: db.TIMESTAMP,
					defaultValue: "test test test"
				},
			});
			db.connect(function(err) {
				t.err = err;
				done();
			});
		});

		after(function(done) {
			clean(db, done);
		});

		it("err.pgo.code is 1025", function() {
			assert.equal(this.err.pgo.code, 1025);
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});
	});

	describe("begin error", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			er = -3;
			db.model("test1", {
				a: db.INT4,
			});
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				db.begin(function(err, tx) {
					t.err = err;
					done();
				});
			});
		});

		after(function(done) {
			clean(db, done);
		});

		it("err is test", function() {
			assert.equal(this.err.code, "test");
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});
	});
});
