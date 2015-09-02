/* jshint mocha: true */
"use strict";

var assert = require("assert");
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
			db.model("test1", {});
			db.model("test2", {
				a: db.FKEY("test1")
			});
			db.connect(function(err) {
				if(err) {
					t.err = err;

					return done();
				}

				var db2 = db.clone(function(msg) { logs2.push(msg); });
				db2.load.test1({id: 5}, function(err, res) {
					if(err) {
						t.err = err;

						return done();
					}

					var t2 = new db2.models.test1();
					t2.save(function(err) {
						t.err = err;
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

		it("17 log lines", function() {
			assert.equal(logs.length, 17);
		});

		it("2 alternative log lines", function() {
			assert.equal(logs2.length, 2);
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
