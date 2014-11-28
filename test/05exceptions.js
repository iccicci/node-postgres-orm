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

describe("exceptions", function() {
	describe("double model", function() {
		before(function() {
			try {
				db = newPgo();
				db.model("foo", {});
				db.model("foo", {});
			}
			catch(e) {
				this.e = e;
			}
		});

		it("exception", function() {
			assert.ok(this.e);
			assert.equal(this.e.message, "PgOrm: Model already defined: foo");
		});
	});

	describe("model after connect", function() {
		before(function(done) {
			t   = this;
			db = newPgo();
			db.model("test1", {});
			db.connect(function(err) {
				try {
					db.model("foo", {});
				}
				catch(e) {
					t.e = e;
				}
				done();
			});
		});

		after(function(done) {
			clean(db, done);
		});

		it("exception", function() {
			assert.ok(this.e);
			assert.equal(this.e.message, "PgOrm: Can't call PgOrm.table after PgOrm.connect");
		});
	});

	describe("undefined parent", function() {
		before(function() {
			try {
				db = newPgo();
				db.model("foo", {});
				db.model("bar", {}, {parent: "baz"});
			}
			catch(e) {
				this.e = e;
			}
		});

		it("exception", function() {
			assert.ok(this.e);
			assert.equal(this.e.message, "PgOrm: Parent model 'baz' for model 'bar' doesn't exists");
		});
	});

	describe("undefined FK reference", function() {
		before(function() {
			try {
				db = newPgo();
				db.model("foo", {});
				db.model("bar", {a: db.FKEY("baz")});
			}
			catch(e) {
				this.e = e;
			}
		});

		it("exception", function() {
			assert.ok(this.e);
			assert.equal(this.e.message, "PgOrm: Can't find model 'baz' to create FOREING KEY on 'bar.a'");
		});
	});

	describe("undefined FK reference field", function() {
		before(function() {
			try {
				db = newPgo();
				db.model("foo", {});
				db.model("bar", {a: db.FKEY("foo", "a")});
			}
			catch(e) {
				this.e = e;
			}
		});

		it("exception", function() {
			assert.ok(this.e);
			assert.equal(this.e.message, "PgOrm: Can't find field 'foo.a' to create FOREING KEY on 'bar.a'");
		});
	});

	describe("undefined datatype", function() {
		before(function() {
			try {
				db = newPgo();
				db.model("foo", {a: "undefined type"});
			}
			catch(e) {
				this.e = e;
			}
		});

		it("exception", function() {
			assert.ok(this.e);
			assert.equal(this.e.message, "PgOrm: Can't find a valid type for 'foo.a'");
		});
	});
});
