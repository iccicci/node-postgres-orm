/* jshint mocha: true */
"use strict";

var assert = require("assert");
var db;
var t;
var tmp;

var helper    = require("./helper");
var cleanLogs = helper.cleanLogs;
var clean     = helper.clean;
var logs      = helper.logs;
var newPgo    = helper.newPgo;

describe("interface errors", function() {
	describe("preSave as validate", function() {
		before(function(done) {
			t  = this;
			db = newPgo();
			db.model("test1", {}, { preSave: function() { return "test Error"; } });
			db.model("test2", {}, { parent: "test1" });
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				cleanLogs();
				var tmp = new db.models.test2();
				tmp.save(function(err) {
					t.err = err;
					done();
				});
			});
		});

		after(function(done) {
			clean(db, done);
		});

		it("err is 'test Error'", function() {
			assert.equal(this.err, "test Error");
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});

		it("0 log lines", function() {
			assert.equal(logs.length, 0);
		});
	});

	describe("preSave exception", function() {
		before(function(done) {
			t  = this;
			db = newPgo();
			db.model("test1", {}, { preSave: function() { throw new Error("test Error"); } });
			db.model("test2", {}, { parent: "test1" });
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				cleanLogs();
				var tmp = new db.models.test2();
				tmp.save(function(err) {
					t.err = err;
					done();
				});
			});
		});

		after(function(done) {
			clean(db, done);
		});

		it("err is 'test Error' exception", function() {
			assert.equal(this.err.message, "test Error");
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});

		it("0 log lines", function() {
			assert.equal(logs.length, 0);
		});
	});

	describe("save DB error", function() {
		before(function(done) {
			t  = this;
			db = newPgo();
			db.model("test1", { a: { type: db.INT4, notNull: true }});
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				cleanLogs();
				var tmp = new db.models.test1();
				tmp.save(function(err) {
					t.err = err;
					done();
				});
			});
		});

		after(function(done) {
			clean(db, done);
		});

		it("pg error code is '23502'", function() {
			assert.equal(this.err.code, "23502");
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});

		it("2 log lines", function() {
			assert.equal(logs.length, 2);
		});
	});

	describe("load DB error", function() {
		before(function(done) {
			t  = this;
			db = newPgo();
			db.model("test1", {});
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				cleanLogs();
				db.pg.connect(db.database, function(err, client, pgdone) {
					t.err = err;
					if(err)
						return done();
					client.query("DROP TABLE test1s", null, function(err, res) {
						t.err = err;
						if(err) {
							pgdone();
							return done();
						}
						db.load.test1({id: 1}, function(err) {
							t.err = err;
							pgdone();
							done();
						});
					});
				});
			});
		});

		after(function(done) {
			clean(db, done);
		});

		it("pg error code is '42P01'", function() {
			assert.equal(this.err.code, "42P01");
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});

		it("1 log lines", function() {
			assert.equal(logs.length, 1);
		});
	});

	describe("save DB error while SELECT from sequence", function() {
		before(function(done) {
			t  = this;
			db = newPgo();
			db.model("test1", {});
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				cleanLogs();
				db.pg.connect(db.database, function(err, client, pgdone) {
					t.err = err;
					if(err)
						return done();
					client.query("DROP SEQUENCE test1s_id_seq CASCADE", null, function(err, res) {
						t.err = err;
						if(err) {
							pgdone();
							return done();
						}
						var tmp = new db.models.test1();
						tmp.save(function(err) {
							t.err = err;
							pgdone();
							done();
						});
					});
				});
			});
		});

		after(function(done) {
			clean(db, done);
		});

		it("pg error code is '42P01'", function() {
			assert.equal(this.err.code, "42P01");
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});

		it("1 log lines", function() {
			assert.equal(logs.length, 1);
		});
	});

	describe("postSave exception", function() {
		before(function(done) {
			t  = this;
			db = newPgo();
			db.model("test1", {}, { postSave: function() { throw new Error("test Error"); } });
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				cleanLogs();
				var tmp = new db.models.test1();
				tmp.save(function(err) {
					t.err = err;
					db.load.test1({id: 1}, function(err, res) {
						t.err2 = err;
						t.res  = res;
						done();
					});
				});
			});
		});

		after(function(done) {
			clean(db, done);
		});

		it("err is 'test Error' exception", function() {
			assert.equal(this.err.message, "test Error");
		});

		it("err2 is null", function() {
			assert.ifError(this.err2);
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});

		it("3 log lines", function() {
			assert.equal(logs.length, 3);
		});

		it("1 record loaded", function() {
			assert.equal(this.res.length, 1);
		});

		it("record 1 loaded", function() {
			assert.equal(this.res[0].id, 1);
		});
	});

	describe("postLoad exception", function() {
		before(function(done) {
			t  = this;
			db = newPgo();
			db.model("test1", {}, { postLoad: function() { throw new Error("test Error"); } });
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				var tmp = new db.models.test1();
				tmp.save(function(err) {
					t.err = err;
					if(err)
						return done();
					cleanLogs();
					db.load.test1({id: 1}, function(err, res) {
						t.err = err;
						done();
					});
				});
			});
		});

		after(function(done) {
			clean(db, done);
		});

		it("err is 'test Error' exception", function() {
			assert.equal(this.err.message, "test Error");
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});

		it("1 log lines", function() {
			assert.equal(logs.length, 1);
		});
	});

	describe("strange save", function() {
		before(function(done) {
			t  = this;
			db = newPgo();
			db.model("test1", {
				a: { type: db.INT4, defaultValue: 10 },
				b: db.VARCHAR,
				c: db.JSON,
			}, { init: function() { this.b = "test"; } });
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				cleanLogs();
				var tmp = new db.models.test1();
				tmp.save();
				setTimeout(done, 20);
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
	});

	describe("strange save with preSave error", function() {
		before(function(done) {
			t  = this;
			db = newPgo();
			db.model("test1", {}, { preSave: function() { return "testError"; } });
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				cleanLogs();
				var tmp = new db.models.test1();
				tmp.save();
				setTimeout(done, 20);
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

	describe("strange load", function() {
		before(function(done) {
			t  = this;
			db = newPgo();
			db.model("test1", {
				a: { type: db.INT4, defaultValue: 10 },
				b: db.VARCHAR,
				c: db.JSON,
			}, { init: function() { this.b = "test"; } });
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				cleanLogs();
				db.load.test1({id:1});
				setTimeout(done, 20);
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
	});

	describe("strange load with postLoad exception", function() {
		before(function(done) {
			t  = this;
			db = newPgo();
			db.model("test1", {}, { postLoad: function() { throw new Error("test Error"); } });
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				var tmp = new db.models.test1();
				tmp.save(function(err) {
					t.err = err;
					if(err)
						return done();
					cleanLogs();
					db.load.test1({id: 1});
					setTimeout(done, 20);
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
	});

	describe("save connect error", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			db.model("test1", {});
			db.connect(function(err) {
				t.err = err;
				if (err)
					return done();
				cleanLogs();
				var oldDatabase = db.database;
				db.database = "testDB";
				var tmp = new db.models.test1();
				tmp.save(function(err) {
					db.database = oldDatabase;
					t.err = err;
					done();
				});
			});
		});

		after(function(done) {
			clean(db, done);
		});

		it("err.code is 28P01", function() {
			assert.equal(this.err.code, "28P01");
		});

		it("nr connect == nr done + 1", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done + 1);
		});
	});

	describe("load connect error", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			db.model("test1", {});
			db.connect(function(err) {
				t.err = err;
				if (err)
					return done();
				cleanLogs();
				var oldDatabase = db.database;
				db.database = "testDB";
				db.load.test1({id: 1}, function(err) {
					db.database = oldDatabase;
					t.err = err;
					done();
				});
			});
		});

		after(function(done) {
			clean(db, done);
		});

		it("err.code is 28P01", function() {
			assert.equal(this.err.code, "28P01");
		});

		it("nr connect == nr done + 1", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done + 1);
		});
	});
});
