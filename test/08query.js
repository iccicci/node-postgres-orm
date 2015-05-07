/* jshint mocha: true */
"use strict";

var assert = require("assert");
var db;
var t;
var tmp;

var helper = require("./helper");
var cleanLogs = helper.cleanLogs;
var clean = helper.clean;
var logs = helper.logs;
var newPgo = helper.newPgo;

describe("query", function() {
	before(function(done) {
		db = newPgo();
		db.model("test1", {
			a: db.INT4,
			b: db.VARCHAR,
			c: db.JSON
		});
		db.connect(function(err) {
			if(err)
				return done();
			tmp = new db.models.test1();
			tmp.a = 1;
			tmp.b = "aaa";
			tmp.save(function(err) {
				if(err)
					return done();
				tmp = new db.models.test1();
				tmp.a = 2;
				tmp.b = "abc";
				tmp.save(function(err) {
					if(err)
						return done();
					tmp = new db.models.test1();
					tmp.a = 1;
					tmp.b = "aba";
					tmp.c = {
						test1: 1,
						test2: "test"
					};
					tmp.save(function(err) {
						if(err)
							return done();
						tmp = new db.models.test1();
						tmp.a = 2;
						tmp.b = "bbb";
						tmp.c = {
							test1: 1
						};
						tmp.save(function(err) {
							done();
						});
					});
				});
			});
		});
	});

	after(function(done) {
		clean(db, done);
	});

	describe("wrong where", function() {
		before(function(done) {
			t = this;
			try {
				db.load.test1({
					test_where: 1
				}, function() {});
			}
			catch(e) {
				t.e = e;
				done();
			}
		});

		it("exception", function() {
			assert.ok(this.e);
			assert.equal(this.e.message, "Pgo.load: can't find any valid field-operation for: test_where");
		});
	});

	describe("equal", function() {
		before(function(done) {
			t = this;
			db.load.test1({
				a__eq: 1
			}, "id", function(err, res) {
				t.err = err;
				t.res = res;
				done();
			});
		});

		it("err is null", function() {
			assert.ifError(this.err);
		});

		it("2 record", function() {
			assert.equal(this.res.length, 2);
		});

		it("record 1", function() {
			assert.equal(this.res[0].id, 1);
		});

		it("record 2", function() {
			assert.equal(this.res[1].id, 3);
		});
	});

	describe("not equal", function() {
		before(function(done) {
			t = this;
			db.load.test1({
				a__ne: 1
			}, "id", function(err, res) {
				t.err = err;
				t.res = res;
				done();
			});
		});

		it("err is null", function() {
			assert.ifError(this.err);
		});

		it("2 record", function() {
			assert.equal(this.res.length, 2);
		});

		it("record 1", function() {
			assert.equal(this.res[0].id, 2);
		});

		it("record 2", function() {
			assert.equal(this.res[1].id, 4);
		});
	});

	describe("lesser than", function() {
		before(function(done) {
			t = this;
			db.load.test1({
				a__lt: 2
			}, "id", function(err, res) {
				t.err = err;
				t.res = res;
				done();
			});
		});

		it("err is null", function() {
			assert.ifError(this.err);
		});

		it("2 record", function() {
			assert.equal(this.res.length, 2);
		});

		it("record 1", function() {
			assert.equal(this.res[0].id, 1);
		});

		it("record 2", function() {
			assert.equal(this.res[1].id, 3);
		});
	});

	describe("lesser than or equal to", function() {
		before(function(done) {
			t = this;
			db.load.test1({
				a__le: 1
			}, "id", function(err, res) {
				t.err = err;
				t.res = res;
				done();
			});
		});

		it("err is null", function() {
			assert.ifError(this.err);
		});

		it("2 record", function() {
			assert.equal(this.res.length, 2);
		});

		it("record 1", function() {
			assert.equal(this.res[0].id, 1);
		});

		it("record 2", function() {
			assert.equal(this.res[1].id, 3);
		});
	});

	describe("greater than", function() {
		before(function(done) {
			t = this;
			db.load.test1({
				a__gt: 1
			}, "id", function(err, res) {
				t.err = err;
				t.res = res;
				done();
			});
		});

		it("err is null", function() {
			assert.ifError(this.err);
		});

		it("2 record", function() {
			assert.equal(this.res.length, 2);
		});

		it("record 1", function() {
			assert.equal(this.res[0].id, 2);
		});

		it("record 2", function() {
			assert.equal(this.res[1].id, 4);
		});
	});

	describe("greater than or equal to", function() {
		before(function(done) {
			t = this;
			db.load.test1({
				a__ge: 2
			}, "id", function(err, res) {
				t.err = err;
				t.res = res;
				done();
			});
		});

		it("err is null", function() {
			assert.ifError(this.err);
		});

		it("2 record", function() {
			assert.equal(this.res.length, 2);
		});

		it("record 1", function() {
			assert.equal(this.res[0].id, 2);
		});

		it("record 2", function() {
			assert.equal(this.res[1].id, 4);
		});
	});

	describe("like", function() {
		before(function(done) {
			t = this;
			db.load.test1({
				b__like: "ab%"
			}, "id", function(err, res) {
				t.err = err;
				t.res = res;
				done();
			});
		});

		it("err is null", function() {
			assert.ifError(this.err);
		});

		it("2 record", function() {
			assert.equal(this.res.length, 2);
		});

		it("record 1", function() {
			assert.equal(this.res[0].id, 2);
		});

		it("record 2", function() {
			assert.equal(this.res[1].id, 3);
		});
	});

	describe("null", function() {
		before(function(done) {
			t = this;
			db.load.test1({
				c__null: true
			}, "id", function(err, res) {
				t.err = err;
				t.res = res;
				done();
			});
		});

		it("err is null", function() {
			assert.ifError(this.err);
		});

		it("2 record", function() {
			assert.equal(this.res.length, 2);
		});

		it("record 1", function() {
			assert.equal(this.res[0].id, 1);
		});

		it("record 2", function() {
			assert.equal(this.res[1].id, 2);
		});
	});

	describe("not null", function() {
		before(function(done) {
			t = this;
			db.load.test1({
				c__null: false
			}, "id", function(err, res) {
				t.err = err;
				t.res = res;
				done();
			});
		});

		it("err is null", function() {
			assert.ifError(this.err);
		});

		it("2 record", function() {
			assert.equal(this.res.length, 2);
		});

		it("record 1", function() {
			assert.equal(this.res[0].id, 3);
		});

		it("record 2", function() {
			assert.equal(this.res[1].id, 4);
		});
	});

	describe("custom where 1", function() {
		before(function(done) {
			t = this;
			db.load.test1({
				__: "c->>'test1' = '1'"
			}, "id", function(err, res) {
				t.err = err;
				t.res = res;
				done();
			});
		});

		it("err is null", function() {
			assert.ifError(this.err);
		});

		it("2 record", function() {
			assert.equal(this.res.length, 2);
		});

		it("record 1", function() {
			assert.equal(this.res[0].id, 3);
		});

		it("record 2", function() {
			assert.equal(this.res[1].id, 4);
		});
	});

	describe("custom where 2", function() {
		before(function(done) {
			t = this;
			db.load.test1({
				__: "c->>'test2' = 'test'"
			}, "id", function(err, res) {
				t.err = err;
				t.res = res;
				done();
			});
		});

		it("err is null", function() {
			assert.ifError(this.err);
		});

		it("1 record", function() {
			assert.equal(this.res.length, 1);
		});

		it("record 1", function() {
			assert.equal(this.res[0].id, 3);
		});
	});
});
