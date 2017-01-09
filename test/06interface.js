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
var util = require("util");

describe("interface", function() {
	describe("init, save, load & delete", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			db.model("test1", {
				a: {
					type: db.INT4,
					defaultValue: 10
				},
				b: db.VARCHAR,
				c: db.JSON,
			}, {
				init: function() {
					this.b = "test";
				}
			});
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				cleanLogs();
				var tmp = new db.models.test1();
				tmp.c = {
					a: "b",
					c: [
						"d",
						10
					]
				};
				tmp.save(function(err) {
					t.err = err;
					if(err)
						return done();
					db.load.test1({
						id: 1
					}, function(err, res) {
						t.err = err;
						t.res = res;
						if(err)
							return done();
						res[0].del(function(err) {
							t.err = err;
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

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});

		it("3 log lines", function() {
			assert.equal(logs.length, 3);
		});

		it("INSERT", function() {
			assert.equal(logs[0], "INSERT INTO test1s (b,c) VALUES ($1,$2) :: [\"test\",{\"a\":\"b\",\"c\":[\"d\",10]}]");
		});

		it("SELECT", function() {
			assert.equal(logs[1], "SELECT tableoid, * FROM test1s WHERE id = $1 :: [1]");
		});

		it("DELETE", function() {
			assert.equal(logs[2], "DELETE FROM test1s WHERE id = $1 :: [\"1\"]");
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
			t = this;
			db = newPgo();
			db.model("test1", {
				a: {
					type: db.INT4,
					defaultValue: 10
				},
				b: db.VARCHAR,
				c: db.JSON,
				d: db.INT4,
				e: db.INT4,
				f: db.INT4,
			}, {
				init: function() {
					this.b = "test";
				}
			});
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				var tmp = new db.models.test1();
				tmp.c = {
					a: "b",
					c: [
						"d",
						10
					]
				};
				tmp.e = 10;
				tmp.save(function(err) {
					t.err = err;
					if(err)
						return done();
					cleanLogs();
					tmp.a = 20;
					delete tmp.e;
					tmp.save(done);
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

		it("UPDATE", function() {
			assert.equal(logs[0], "UPDATE test1s SET a = $1, e = $2 WHERE id = $3 :: [20,null,\"1\"]");
		});
	});

	describe("attributes", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			db.model("test1", {
				a: db.INT4
			}, {
				attributes: {
					b: function() {
						db.log(this.a);
					}
				}
			});
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				var tmp = new db.models.test1();
				tmp.a = 12;
				tmp.b();
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

		it("method called", function() {
			assert.equal(logs[8], 12);
		});
	});

	describe("pre & post - delete, load & save", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			db.model("test1", {
				a: db.INT4,
				b: db.VARCHAR,
				c: db.JSON,
			}, {
				postDelete: function() {
					db.log("postDelete");
				},
				postLoad: function() {
					db.log("postLoad");
				},
				postSave: function() {
					db.log("postSave");
				},
				preDelete: function() {
					db.log("preDelete");
				},
				preSave: function() {
					db.log("preSave");
				},
			});
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				cleanLogs();
				var tmp = new db.models.test1();
				tmp.a = 10;
				tmp.b = "test";
				tmp.c = {
					a: "b",
					c: [
						"d",
						10
					]
				};
				tmp.save(function(err) {
					t.err = err;
					if(err)
						return done();
					db.load.test1({
						id: 1
					}, function(err, res) {
						t.err = err;
						if(err)
							return done();
						res[0].del(function(err) {
							t.err = err;
							t.res = res;
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

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});

		it("8 log lines", function() {
			assert.equal(logs.length, 8);
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

		it("preDelete", function() {
			assert.equal(logs[5], "preDelete");
		});

		it("postDelete", function() {
			assert.equal(logs[7], "postDelete");
		});
	});

	describe("postSave", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			db.model("test1", {
				a: db.INT4,
			}, {
				postSave: function(saved) {
					db.log("postSave " + saved);
				},
			});
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				cleanLogs();
				var tmp = new db.models.test1();
				tmp.a = 10;
				tmp.save(function(err) {
					t.err = err;
					if(err)
						return done();
					tmp.save(function(err) {
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

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});

		it("3 log lines", function() {
			assert.equal(logs.length, 3);
		});

		it("preSave 1", function() {
			assert.equal(logs[1], "postSave true");
		});

		it("postSave 2", function() {
			assert.equal(logs[2], "postSave false");
		});
	});

	describe("models inheritance", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			db.model("test1", {
				a: db.INT4,
			}, {
				postLoad: function() {
					db.log("postLoad1");
				},
				postSave: function() {
					db.log("postSave1");
				},
				preSave: function() {
					db.log("preSave1");
				},
			});
			db.model("test2", {
				b: db.INT4,
			}, {
				parent: "test1",
				postLoad: function() {
					db.log("postLoad2");
				},
				postSave: function() {
					db.log("postSave2");
				},
				preSave: function() {
					db.log("preSave2");
				},
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
					db.load.test2({
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
			assert.equal(logs[2], "INSERT INTO test2s DEFAULT VALUES :: []");
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

	describe("true model load", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			db.model("test1", {
				a: db.INT4,
			}, {
				postLoad: function() {
					db.log("postLoad1");
				},
				postSave: function() {
					db.log("postSave1");
				},
				preSave: function() {
					db.log("preSave1");
				},
			});
			db.model("test2", {
				b: db.INT4,
			}, {
				parent: "test1",
				postLoad: function() {
					db.log("postLoad2");
				},
				postSave: function() {
					db.log("postSave2");
				},
				preSave: function() {
					db.log("preSave2");
				},
			});
			db.model("test3", {
				c: db.INT4,
			}, {
				parent: "test2",
				postLoad: function() {
					db.log("postLoad3");
				},
				postSave: function() {
					db.log("postSave3");
				},
				preSave: function() {
					db.log("preSave3");
				},
			});
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				cleanLogs();
				var tmp = new db.models.test3();
				tmp.c = 8;
				tmp.save(function(err) {
					t.err = err;
					if(err)
						return done();
					tmp = new db.models.test3();
					tmp.c = 10;
					tmp.save(function(err) {
						t.err = err;
						if(err)
							return done();
						db.load.test1({
							id__in: [
								1,
								2
							]
						}, "-id", function(err, res) {
							t.err = err;
							t.res1 = res;
							db.load.test2({
								id__in: [
									1,
									2
								]
							}, "-id", function(err, res) {
								t.err = err;
								t.res2 = res;
								db.load.test3({
									id__in: [
										1,
										2
									]
								}, "-id", function(err, res) {
									t.err = err;
									t.res3 = res;
									done();
								});
							});
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

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});

		it("37 log lines", function() {
			assert.equal(logs.length, 37);
		});

		it("preSave1 1", function() {
			assert.equal(logs[0], "preSave1");
		});

		it("preSave2 1", function() {
			assert.equal(logs[1], "preSave2");
		});

		it("preSave3 1", function() {
			assert.equal(logs[2], "preSave3");
		});

		it("INSERT", function() {
			assert.equal(logs[3], "INSERT INTO test3s (c) VALUES ($1) :: [8]");
		});

		it("postSave1 1", function() {
			assert.equal(logs[4], "postSave1");
		});

		it("postSave2 1", function() {
			assert.equal(logs[5], "postSave2");
		});

		it("postSave3 1", function() {
			assert.equal(logs[6], "postSave3");
		});

		it("preSave1 2", function() {
			assert.equal(logs[7], "preSave1");
		});

		it("preSave2 2", function() {
			assert.equal(logs[8], "preSave2");
		});

		it("preSave3 2", function() {
			assert.equal(logs[9], "preSave3");
		});

		it("postLoad1", function() {
			assert.equal(logs[16], "postLoad1");
		});

		it("postLoad2", function() {
			assert.equal(logs[17], "postLoad2");
		});

		it("postLoad3", function() {
			assert.equal(logs[18], "postLoad3");
		});

		it("load 1 1", function() {
			assert.equal(this.res1[0].c, 10);
		});

		it("load 2 1", function() {
			assert.equal(this.res2[0].c, 10);
		});

		it("load 3 1", function() {
			assert.equal(this.res3[0].c, 10);
		});

		it("load 1 2", function() {
			assert.equal(this.res1[1].c, 8);
		});

		it("load 2 2", function() {
			assert.equal(this.res2[1].c, 8);
		});

		it("load 3 2", function() {
			assert.equal(this.res3[1].c, 8);
		});
	});

	describe("foreing key", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			db.model("test1", {});
			db.model("test2", {
				a: db.FKEY("test1")
			});
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

	describe("order by", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			db.model("test1", {
				a: db.INT4
			});
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				tmp = new db.models.test1();
				tmp.a = 1;
				tmp.save(function(err) {
					t.err = err;
					if(err)
						return done();
					tmp = new db.models.test1();
					tmp.a = 2;
					tmp.save(function(err) {
						t.err = err;
						if(err)
							return done();
						tmp = new db.models.test1();
						tmp.a = 1;
						tmp.save(function(err) {
							t.err = err;
							if(err)
								return done();
							tmp = new db.models.test1();
							tmp.a = 2;
							tmp.save(function(err) {
								t.err = err;
								if(err)
									return done();
								db.load.test1({}, ["a", "-id"], function(err, res) {
									t.err = err;
									t.res = res;
									return done();
								});
							});
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

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});

		it("4 record loaded", function() {
			assert.equal(this.res.length, 4);
		});

		it("record 1", function() {
			assert.equal(this.res[0].id, 3);
		});

		it("record 2", function() {
			assert.equal(this.res[1].id, 1);
		});

		it("record 3", function() {
			assert.equal(this.res[2].id, 4);
		});

		it("record 4", function() {
			assert.equal(this.res[3].id, 2);
		});
	});

	describe("defaultValue Vs init", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			db.model("test1", {
				a: {
					type: db.INT4,
					defaultValue: 10
				},
				b: db.INT4,
				c: {
					type: db.TIMESTAMP,
					defaultValue: db.NOW
				},
				d: db.TIMESTAMP,
			}, {
				init: function() {
					this.b = 12;
					this.d = new Date();
				}
			});
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				cleanLogs();
				var tmp = new db.models.test1();
				t.res1 = Object.clone(tmp, true);
				tmp.save(function(err) {
					t.err = err;
					if(err)
						return done();
					t.res2 = tmp;
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

		it("a 1", function() {
			assert.equal(this.res1.a, undefined);
		});

		it("b 1", function() {
			assert.equal(this.res1.b, 12);
		});

		it("c 1", function() {
			assert.equal(this.res1.c, undefined);
		});

		it("d 1", function() {
			assert.ok(util.isDate(this.res1.d));
		});

		it("a 2", function() {
			assert.equal(this.res2.a, 10);
		});

		it("b 2", function() {
			assert.equal(this.res2.b, 12);
		});

		it("c 2", function() {
			assert.ok(util.isDate(this.res2.c));
		});

		it("d 2", function() {
			assert.ok(this.res2.c >= this.res2.d);
		});
	});

	describe("primaryKey true model, save & delete", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			db.model("test1", {
				a: db.INT4,
			}, {
				primaryKey: "a"
			});
			db.model("test2", {
				b: db.INT4,
			}, {
				parent: "test1"
			});
			db.model("test3", {
				c: db.INT4,
			}, {
				parent: "test2"
			});
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				cleanLogs();
				var tmp = new db.models.test3();
				tmp.a = 10;
				tmp.b = 11;
				tmp.c = 12;
				tmp.save(function(err) {
					t.err = err;
					if(err)
						return done();
					db.load.test2({
						a: 10,
					}, function(err, res) {
						t.err = err;
						if(err)
							return done();
						res[0].b = 12;
						res[0].save(function(err) {
							t.err = err;
							if(err)
								return done();
							res[0].del(function(err) {
								t.err = err;
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

		it("err is null", function() {
			assert.ifError(this.err);
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});

		it("5 log lines", function() {
			assert.equal(logs.length, 5);
		});

		it("INSERT INTO test3s (a,b,c) VALUES ($1,$2,$3) :: [10,11,12]", function() {
			assert.equal(logs[0], "INSERT INTO test3s (a,b,c) VALUES ($1,$2,$3) :: [10,11,12]");
		});

		it("SELECT tableoid, * FROM test2s WHERE a = $1 :: [10]", function() {
			assert.equal(logs[1], "SELECT tableoid, * FROM test2s WHERE a = $1 :: [10]");
		});

		it("SELECT tableoid, * FROM test3s WHERE a IN ($1) :: [\"10\"]", function() {
			assert.equal(logs[2], "SELECT tableoid, * FROM test3s WHERE a IN ($1) :: [\"10\"]");
		});

		it("UPDATE test3s SET b = $1 WHERE a = $2 :: [12,10]", function() {
			assert.equal(logs[3], "UPDATE test3s SET b = $1 WHERE a = $2 :: [12,10]");
		});

		it("DELETE FROM test3s WHERE a = $1 :: [10]", function() {
			assert.equal(logs[4], "DELETE FROM test3s WHERE a = $1 :: [10]");
		});
	});
});
