/* jshint mocha: true */
"use strict";

var assert = require("assert");
var db;
var t;

var helper = require("./helper");
var newPgo = helper.newPgo;

describe("pgo", function() {
	describe("correct connect", function() {
		before(function(done) {
			t  = this;
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
			t  = this;
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
			oldLog      = console.log;
			console.log = function(msg) { testLog = msg; };
			db          = new helper.pgo(process.env.PGO_TEST_DB);

			db.log("test message");

			console.log = oldLog;
		});

		it("log message", function() {
			assert.equal("PgOrm: test message", testLog);
		});
	});
});
