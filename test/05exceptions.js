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
			assert.equal(this.e.message, "Pgo: Model already defined: foo");
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
			assert.equal(this.e.message, "Pgo: Can't call Pgo.table after Pgo.connect");
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
			assert.equal(this.e.message, "Pgo: Parent model 'baz' for model 'bar' doesn't exists");
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
			assert.equal(this.e.message, "Pgo: Can't find model 'baz' to create FOREING KEY on 'bar.a'");
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
			assert.equal(this.e.message, "Pgo: Can't find field 'foo.a' to create FOREING KEY on 'bar.a'");
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
			assert.equal(this.e.message, "Pgo: Can't find a valid type for 'foo.a'");
		});
	});

	describe("undefined field", function() {
		before(function() {
			try {
				db = newPgo();
				db.model("foo", {a: undefined});
			}
			catch(e) {
				this.e = e;
			}
		});

		it("exception", function() {
			assert.ok(this.e);
			assert.equal(this.e.message, "Pgo: Undefined field: 'foo.a'");
		});
	});

	describe("VARCAHR len not integer", function() {
		before(function() {
			try {
				db = newPgo();
				db.model("foo", {a: db.VARCHAR("test")});
			}
			catch(e) {
				this.e = e;
			}
		});

		it("exception", function() {
			assert.ok(this.e);
			assert.equal(this.e.message, "Pgo.VARCHAR: len must be a positive integer");
		});
	});

	describe("VARCAHR negative len", function() {
		before(function() {
			try {
				db = newPgo();
				db.model("foo", {a: db.VARCHAR(-12)});
			}
			catch(e) {
				this.e = e;
			}
		});

		it("exception", function() {
			assert.ok(this.e);
			assert.equal(this.e.message, "Pgo.VARCHAR: len must be a positive integer");
		});
	});

	describe("Pgo.model wrong fields", function() {
		before(function() {
			try {
				db = newPgo();
				db.model("foo", "test");
			}
			catch(e) {
				this.e = e;
			}
		});

		it("exception", function() {
			assert.ok(this.e);
			assert.equal(this.e.message, "Pgo.model: fields must be an Object");
		});
	});

	describe("Pgo.model wrong options", function() {
		before(function() {
			try {
				db = newPgo();
				db.model("foo", {a: db.VARCHAR(12)}, "test");
			}
			catch(e) {
				this.e = e;
			}
		});

		it("exception", function() {
			assert.ok(this.e);
			assert.equal(this.e.message, "Pgo.model: options must be an Object");
		});
	});

	describe("Pgo.model index without fields", function() {
		before(function() {
			try {
				db = newPgo();
				db.model("foo", {a: db.VARCHAR(12)}, { index: ["a", {}] });
			}
			catch(e) {
				this.e = e;
			}
		});

		it("exception", function() {
			assert.ok(this.e);
			assert.equal(this.e.message, "Pgo.model: index (idx: 1) without fields");
		});
	});

	describe("Pgo.model wrong datetime precision", function() {
		before(function() {
			try {
				db = newPgo();
				db.model("foo", {a: db.TIMESTAMP({precision: 12})});
			}
			catch(e) {
				this.e = e;
			}
		});

		it("exception", function() {
			assert.ok(this.e);
			assert.equal(this.e.message, "Pgo.TIMESTAMP: precision must be an integer between 0 and 6");
		});
	});
});
