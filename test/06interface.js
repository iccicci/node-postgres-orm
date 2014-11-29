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

describe("interface", function() {
	describe("init, save & load", function() {
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
				tmp.c = {a: "b", c: ["d", 10]};
				tmp.save(function(err) {
					t.err = err;
					if(err)
						return done();
					db.load.test1({id: 1}, function(err, res) {
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

		it("err is null", function() {
			assert.ifError(this.err);
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});

		it("2 log lines", function() {
			assert.equal(logs.length, 2);
		});

		it("INSERT", function() {
			assert.equal(logs[0], "INSERT INTO test1s (id,a,b,c) VALUES ($1,$2,$3,$4) :: [\"1\",10,\"test\",\"{\\\"a\\\":\\\"b\\\",\\\"c\\\":[\\\"d\\\",10]}\"]");
		});

		it("SELECT", function() {
			assert.equal(logs[1], "SELECT * FROM test1s WHERE id = $1 :: [1]");
		});

		it("1 record", function() {
			assert.equal(this.res.length, 1);
		});

		it("a", function() {
			assert.equal(this.res[0].a, 10);
		});

		it("b", function() {
			assert.equal(this.res[0].b, "test");
		});

		it("c.a", function() {
			assert.equal(this.res[0].c.a, "b");
		});

		it("c.c[0]", function() {
			assert.equal(this.res[0].c.c[0], "d");
		});

		it("c.c[1]", function() {
			assert.equal(this.res[0].c.c[1], 10);
		});
	});

	describe("modify", function() {
		before(function(done) {
			t  = this;
			db = newPgo();
			db.model("test1", {
				a: { type: db.INT4, defaultValue: 10 },
				b: db.VARCHAR,
				c: db.JSON,
				d: db.INT4,
			}, { init: function() { this.b = "test"; } });
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				cleanLogs();
				var tmp = new db.models.test1();
				tmp.c = {a: "b", c: ["d", 10]};
				tmp.save(function(err) {
					t.err = err;
					if(err)
						return done();
					tmp.a = 20;
					tmp.save();
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

		it("2 log lines", function() {
			assert.equal(logs.length, 2);
		});

		it("UPDATE", function() {
			assert.equal(logs[1], "UPDATE test1s SET a = $1, b = $2, c = $3, d = $4 WHERE id = $5 :: [20,\"test\",\"{\\\"a\\\":\\\"b\\\",\\\"c\\\":[\\\"d\\\",10]}\",null,\"1\"]");
		});
	});

	describe("pre & post - load & save", function() {
		before(function(done) {
			t  = this;
			db = newPgo();
			db.model("test1", {
				a: db.INT4,
				b: db.VARCHAR,
				c: db.JSON,
			}, {
				postLoad: function() { db.log("postLoad"); },
				postSave: function() { db.log("postSave"); },
				preSave:  function() { db.log("preSave"); },
			});
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				cleanLogs();
				var tmp = new db.models.test1();
				tmp.a = 10;
				tmp.b = "test";
				tmp.c = {a: "b", c: ["d", 10]};
				tmp.save(function(err) {
					t.err = err;
					if(err)
						return done();
					db.load.test1({id: 1}, function(err, res) {
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

		it("err is null", function() {
			assert.ifError(this.err);
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});

		it("5 log lines", function() {
			assert.equal(logs.length, 5);
		});

		it("preSave", function() {
			assert.equal(logs[0], "preSave");
		});

		it("postSave", function() {
			assert.equal(logs[2], "postSave");
		});

		it("postLoad", function() {
			assert.equal(logs[4], "postLoad");
		});
	});

	describe("models inheritance", function() {
		before(function(done) {
			t  = this;
			db = newPgo();
			db.model("test1", {
				a: db.INT4,
			}, {
				postLoad: function() { db.log("postLoad1"); },
				postSave: function() { db.log("postSave1"); },
				preSave:  function() { db.log("preSave1"); },
			});
			db.model("test2", {
				b: db.INT4,
			}, {
				parent:   "test1",
				postLoad: function() { db.log("postLoad2"); },
				postSave: function() { db.log("postSave2"); },
				preSave:  function() { db.log("preSave2"); },
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
					db.load.test2({id: 1}, function(err, res) {
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

		it("err is null", function() {
			assert.ifError(this.err);
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});

		it("8 log lines", function() {
			assert.equal(logs.length, 8);
		});

		it("preSave1", function() {
			assert.equal(logs[0], "preSave1");
		});

		it("preSave2", function() {
			assert.equal(logs[1], "preSave2");
		});

		it("INSERT", function() {
			assert.equal(logs[2], "INSERT INTO test2s (id,a,b) VALUES ($1,$2,$3) :: [\"1\",null,null]");
		});

		it("postSave1", function() {
			assert.equal(logs[3], "postSave1");
		});

		it("postSave2", function() {
			assert.equal(logs[4], "postSave2");
		});

		it("postLoad1", function() {
			assert.equal(logs[6], "postLoad1");
		});

		it("postLoad2", function() {
			assert.equal(logs[7], "postLoad2");
		});
	});

	describe("foreing key", function() {
		before(function(done) {
			t  = this;
			db = newPgo();
			db.model("test1", {});
			db.model("test2", {a: db.FKEY("test1")});
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				tmp = new db.models.test1();
				tmp.save(function(err) {
					t.err = err;
					if(err)
						return done();
					tmp = new db.models.test2();
					tmp.a = 1;
					tmp.aLoad(function(err, res) {
						t.err = err;
						t.res = res;
						return done();
					});
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

		it("1 record loaded", function() {
			assert.equal(this.res.length, 1);
		});

		it("record 1 loaded", function() {
			assert.equal(this.res[0].id, 1);
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

		it("1 log lines", function() {
			assert.equal(logs.length, 1);
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
});
