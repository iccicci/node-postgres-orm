"use strict";

var assert = require("assert");
var util   = require("util");
var db;
var t;

var helper = require("./helper");
var clean = helper.clean;
var logs = helper.logs;
var newPgo = helper.newPgo;

describe("pgo", function() {
	describe("correct connect", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			db.connect(function(err) {
				t.err = err;
				done();
			});
		});

		after(function() {
			helper.cleanCounter();
		});

		it("err is null", function() {
			assert.ifError(this.err);
		});

		it("1 connect", function() {
			assert.equal(helper.pgoc.connect, 1);
		});

		it("1 done", function() {
			assert.equal(helper.pgoc.done, 1);
		});
	});

	describe("wrong connect", function() {
		before(function(done) {
			t = this;
			db = new helper.pgo("wrong db string");
			db.connect(function(err) {
				t.err = err;
				done();
			});
		});

		after(function() {
			helper.cleanCounter();
		});

		it("err.pgo.code is 1", function() {
			assert.equal(this.err.pgo.code, 1);
		});

		it("1 connect", function() {
			assert.equal(helper.pgoc.connect, 1);
		});

		it("1 done", function() {
			assert.equal(helper.pgoc.done, 1);
		});
	});

	describe("console.log", function() {
		var oldLog;
		var testLog;

		before(function() {
			oldLog = console.log;
			console.log = function(msg) {
				testLog = msg;
			};
			db = new helper.pgo(process.env.PGO_TEST_DB);

			db.log("test message");

			console.log = oldLog;
		});

		after(function() {
			helper.cleanCounter();
		});

		it("log message", function() {
			assert.equal("Pgo: test message", testLog);
		});
	});

	describe("mock", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			db.connect(function(err) {
				if(err) {
					t.err = err;
					return done();
				}

				db.pg.connect(process.env.PGO_TEST_DB, function(err, client, pgdone) {
					t.err = err;
					t.done = pgdone;
					done();
				});
			});
		});

		after(function() {
			helper.cleanCounter();
			this.done();
		});

		it("err is null", function() {
			assert.ifError(this.err);
		});

		it("2 connect", function() {
			assert.equal(helper.pgoc.connect, 2);
		});

		it("1 done", function() {
			assert.equal(helper.pgoc.done, 1);
		});
	});

	describe("clone", function() {
		var logs2 = [];

		before(function(done) {
			t = this;
			db = newPgo();
			db.model("test1", { a: db.INT4 }, { tableName: "test2s" });
			db.model("test2", {            }, { tableName: "test3s", parent: "test1" });
			db.connect(function(err) {
				if(err) {
					t.err = err;

					return done();
				}

				var db2 = db.clone(function(msg) { logs2.push(msg); });
				db2.load.test1({id: 5}, function(err, res) {
					t.a = res.length;
					if(err) {
						t.err = err;

						return done();
					}

					t.a = res.length;

					var t2 = new db2.models.test2();
					t2.a   = 3;
					t2.save(function(err) {
						t.err = err;
						db.load.test1({a: 3}, function(err, res) {
							if(err) {
								t.err = err;

								return done();
							}

							t.b  = res[0].id;
							t.i1 = t2 instanceof db.models.test1;
							t.i2 = t2 instanceof db2.models.test1;
							t.i3 = t2 instanceof db.models.test2;
							db.log(util.format(t2));
							done();
						});
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

		it("first load 0 records", function() {
			assert.equal(this.a, 0);
		});

		it("second load record 1", function() {
			assert.equal(this.b, 1);
		});

		it("12 log lines", function() {
			assert.equal(logs.length, 12);
		});

		it("2 alternative log lines", function() {
			assert.equal(logs2.length, 2);
		});

		it("model type", function() {
			assert.equal(logs[11], "test2 { a: 3, id: '1' }");
		});

		it("inheritance 1", function() {
			assert.equal(this.i1, true);
		});

		it("inheritance 2 (known bug)", function() {
			assert.equal(this.i2, false);
		});

		it("inheritance 3", function() {
			assert.equal(this.i3, true);
		});
	});

	describe("end", function() {
		var logs2 = [];

		before(function(done) {
			t = this;
			db = newPgo();
			db.model("test1", {});
			db.connect(function(err) {
				t.err = err;
				done();
				db.end();
			});
		});

		after(function(done) {
			clean(db, done);
		});

		it("err is null", function() {
			assert.ifError(this.err);
		});

		it("7 log lines", function() {
			assert.equal(logs.length, 7);
		});
	});
});
