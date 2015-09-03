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

describe("interface errors", function() {
	describe("preSave exception", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			db.model("test1", {}, {
				preSave: function() {
					throw new Error("test Error");
				}
			});
			db.model("test2", {}, {
				parent: "test1"
			});
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

	describe("preDelete exception", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			db.model("test1", {}, {
				preDelete: function() {
					throw new Error("test Error");
				}
			});
			db.model("test2", {}, {
				parent: "test1"
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
					tmp.del(function(err) {
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

	describe("save DB error", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			db.model("test1", {
				a: {
					type: db.INT4,
					notNull: true
				}
			});
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

		it("1 log lines", function() {
			assert.equal(logs.length, 1);
		});
	});

	describe("delete DB error", function() {
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
				cleanLogs();
				var tmp = new db.models.test1();
				tmp.save(function(err) {
					t.err = err;
					if(err)
						return done();
					tmp.__table.__name = "test10";
					tmp.del(function(err) {
						t.err = err;
						done();
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

		it("2 log lines", function() {
			assert.equal(logs.length, 2);
		});
	});

	describe("load DB error", function() {
		before(function(done) {
			t = this;
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
						db.load.test1({
							id: 1
						}, function(err) {
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
			t = this;
			db = newPgo();
			db.model("test1", {}, {
				postSave: function() {
					throw new Error("test Error");
				}
			});
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				cleanLogs();
				var tmp = new db.models.test1();
				tmp.save(function(err) {
					t.err = err;
					db.load.test1({
						id: 1
					}, function(err, res) {
						t.err2 = err;
						t.res = res;
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

		it("2 log lines", function() {
			assert.equal(logs.length, 2);
		});

		it("1 record loaded", function() {
			assert.equal(this.res.length, 1);
		});

		it("record 1 loaded", function() {
			assert.equal(this.res[0].id, 1);
		});
	});

	describe("postDelete exception", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			db.model("test1", {}, {
				postDelete: function() {
					throw new Error("test Error");
				}
			});
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				cleanLogs();
				var tmp = new db.models.test1();
				tmp.save(function(err) {
					t.err = err;
					if(err)
						return done();
					tmp.del(function(err) {
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

		it("err2 is null", function() {
			assert.ifError(this.err2);
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});

		it("2 log lines", function() {
			assert.equal(logs.length, 2);
		});
	});

	describe("postLoad exception", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			db.model("test1", {}, {
				postLoad: function() {
					throw new Error("test Error");
				}
			});
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
					db.load.test1({
						id: 1
					}, function(err, res) {
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
				try {
					tmp.save();
				}
				catch(e) {
					t.e = e;
					done();
				}
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

		it("exception", function() {
			assert.ok(this.e);
			assert.equal(this.e.message, "Pgo.record.save: callback must be a function");
		});
	});

	describe("strange load", function() {
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
				try {
					db.load.test1({
						id: 1
					});
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

		it("err is null", function() {
			assert.ifError(this.err);
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});

		it("exception", function() {
			assert.ok(this.e);
			assert.equal(this.e.message, "Pgo.load: callback must be a function");
		});
	});

	describe("strange delete", function() {
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
				try {
					tmp.del();
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

		it("err is null", function() {
			assert.ifError(this.err);
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});

		it("exception", function() {
			assert.ok(this.e);
			assert.equal(this.e.message, "Pgo.record.del: callback must be a function");
		});
	});

	describe("wrong where", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			db.model("test1", {});
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				cleanLogs();
				try {
					db.load.test1();
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

		it("err is null", function() {
			assert.ifError(this.err);
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});

		it("exception", function() {
			assert.ok(this.e);
			assert.equal(this.e.message, "Pgo.load: where must be an object");
		});
	});

	describe("save connect error", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			db.model("test1", {});
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				cleanLogs();
				var oldDatabase = db.database;
				db.database = "postgres://postgres@localhost/does_not_exists";
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

	describe("delete connect error", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			db.model("test1", {});
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				cleanLogs();
				var tmp = new db.models.test1();
				tmp.save(function(err) {
					t.err = err;
					if(err)
						return done();
					var oldDatabase = db.database;
					db.database = "postgres://postgres@localhost/does_not_exists";
					tmp.del(function(err) {
						db.database = oldDatabase;
						t.err = err;
						done();
					});
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
				if(err)
					return done();
				cleanLogs();
				var oldDatabase = db.database;
				db.database = "postgres://postgres@localhost/does_not_exists";
				db.load.test1({
					id: 1
				}, function(err) {
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

	describe("begin connect error", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			db.model("test1", {});
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				cleanLogs();
				var oldDatabase = db.database;
				db.database = "postgres://postgres@localhost/does_not_exists";
				db.begin(function(err) {
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

	describe("record disappered", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			db.model("test1", {
				a: db.INT4,
				b: db.INT4
			});
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				cleanLogs();
				var tmp = new db.models.test1();
				tmp.save(function(err) {
					t.err = err;
					if(err)
						return done();
					tmp.__obj.id = 10;
					tmp.b = 10;
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

		it("err.pgo.code is 1026", function() {
			assert.equal(this.err.pgo.code, "1026");
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});
	});

	describe("double delete", function() {
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
				var tmp = new db.models.test1();
				tmp.save(function(err) {
					t.err = err;
					if(err)
						return done();
					tmp.del(function(err) {
						t.err = err;
						tmp.del(function(err) {
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

		it("err.pgo.code is 1027", function() {
			assert.equal(this.err.pgo.code, "1027");
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});
	});

	describe("save after delete", function() {
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
				var tmp = new db.models.test1();
				tmp.save(function(err) {
					t.err = err;
					if(err)
						return done();
					tmp.del(function(err) {
						t.err = err;
						tmp.save(function(err) {
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

		it("err.pgo.code is 1028", function() {
			assert.equal(this.err.pgo.code, "1028");
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});
	});

	describe("delete before save", function() {
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
				var tmp = new db.models.test1();
				tmp.del(function(err) {
					t.err = err;
					done();
				});
			});
		});

		after(function(done) {
			clean(db, done);
		});

		it("err.pgo.code is 1029", function() {
			assert.equal(this.err.pgo.code, "1029");
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});
	});

	describe("wrong BEGIN", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			db.model("test1", {
				a: db.INT4,
				b: db.VARCHAR,
			});
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				try {
					db.begin();
				}
				catch(e) {
					t.e = e;
					done();
				}
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

		it("exception", function() {
			assert.ok(this.e);
			assert.equal(this.e.message, "Pgo.begin: callback must be a function");
		});
	});

	describe("wrong COMMIT", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			db.model("test1", {
				a: db.INT4,
				b: db.VARCHAR,
			});
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				db.begin(function(err, tx) {
					t.err = err;
					if(err)
						return done();
					try {
						tx.commit();
					}
					catch(e) {
						t.e = e;
						tx.rollback(done);
					}
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

		it("exception", function() {
			assert.ok(this.e);
			assert.equal(this.e.message, "Transaction.commit: callback must be a function");
		});
	});

	describe("wrong ROLLBACK", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			db.model("test1", {
				a: db.INT4,
				b: db.VARCHAR,
			});
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				db.begin(function(err, tx) {
					t.err = err;
					if(err)
						return done();
					try {
						tx.rollback();
					}
					catch(e) {
						t.e = e;
						tx.rollback(done);
					}
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

		it("exception", function() {
			assert.ok(this.e);
			assert.equal(this.e.message, "Transaction.rollback: callback must be a function");
		});
	});

	describe("new Record with a closed transaction", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			db.model("test1", {
				a: db.INT4,
				b: db.VARCHAR,
			});
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				cleanLogs();
				db.begin(function(err, tx) {
					t.err = err;
					if(err)
						return done();
					tx.rollback(function(err) {
						t.err = err;
						if(err)
							return done();
						try {
							var tmp = new db.models.test1(tx);
						}
						catch(e) {
							t.e = e;
							done();
						}
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

		it("exception", function() {
			assert.ok(this.e);
			assert.equal(this.e.message, "Record: Can't create a new one within an already closed Transaction");
		});
	});

	describe("load with a closed transaction", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			db.model("test1", {
				a: db.INT4,
				b: db.VARCHAR,
			});
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				cleanLogs();
				db.begin(function(err, tx) {
					t.err = err;
					if(err)
						return done();
					tx.rollback(function(err) {
						t.err = err;
						if(err)
							return done();
						tx.load.test1({
							id: 1
						}, function(err, res) {
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

		it("err.pgo.code is 1030", function() {
			assert.equal(this.err.pgo.code, "1030");
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});
	});

	describe("COMMIT with a closed transaction", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			db.model("test1", {
				a: db.INT4,
				b: db.VARCHAR,
			});
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				db.begin(function(err, tx) {
					t.err = err;
					if(err)
						return done();
					tx.rollback(function(err) {
						t.err = err;
						if(err)
							return done();
						tx.commit(function(err, res) {
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

		it("err.pgo.code is 1031", function() {
			assert.equal(this.err.pgo.code, "1031");
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});
	});

	describe("ROLLBACK with a closed transaction", function() {
		before(function(done) {
			t = this;
			db = newPgo();
			db.model("test1", {
				a: db.INT4,
				b: db.VARCHAR,
			});
			db.connect(function(err) {
				t.err = err;
				if(err)
					return done();
				db.begin(function(err, tx) {
					t.err = err;
					if(err)
						return done();
					tx.rollback(function(err) {
						t.err = err;
						if(err)
							return done();
						tx.rollback(function(err, res) {
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

		it("err.pgo.code is 1032", function() {
			assert.equal(this.err.pgo.code, "1032");
		});

		it("nr connect == nr done", function() {
			assert.equal(helper.pgoc.connect, helper.pgoc.done);
		});
	});
});
