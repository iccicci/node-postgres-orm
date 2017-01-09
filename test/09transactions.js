/* jshint mocha: true */
"use strict";

var assert = require("assert");
var db;
var t;
var tmp;
var tmp2;

var helper = require("./helper");
var cleanLogs = helper.cleanLogs;
var clean = helper.clean;
var logs = helper.logs;
var newPgo = helper.newPgo;

describe("transactions", function() {
	before(function(done) {
		db = newPgo();
		db.model("test1", {
			a: db.INT4,
			b: db.VARCHAR
		});
		db.model("test2", {
			a: db.INT4,
			b: db.FKEY("test1")
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
					tmp.save(function(err) {
						if(err)
							return done();
						tmp = new db.models.test1();
						tmp.a = 2;
						tmp.b = "bbb";
						tmp.save(function(err) {
							if(err)
								return done();
							tmp2 = new db.models.test2();
							tmp2.a = 2;
							tmp2.b = tmp.id;
							tmp2.save(function(err) {
								done(err);
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

	describe("ROLLBACK on INSERT", function() {
		before(function(done) {
			t = this;
			db.load.test1({
				a: 3
			}, function(err, res) {
				t.err = err;
				if(err)
					return done();
				t.res1 = res;
				db.begin(function(err, tx) {
					t.err = err;
					if(err)
						return done();
					var tmp = new db.models.test1(tx);
					tmp.a = 3;
					tmp.save(function(err) {
						t.err = err;
						if(err)
							return done();
						db.load.test1({
							a: 3
						}, function(err, res) {
							t.err = err;
							if(err)
								return done();
							t.res2 = res;
							tx.load.test1({
								a: 3
							}, function(err, res) {
								t.err = err;
								if(err)
									return done();
								t.res3 = res;
								tx.rollback(function(err) {
									t.err = err;
									if(err)
										return done();
									db.load.test1({
										a: 3
									}, function(err, res) {
										t.err = err;
										t.res4 = res;
										done();
									});
								});
							});
						});
					});
				});
			});
		});

		it("err is null", function() {
			assert.ifError(this.err);
		});

		it("beginning", function() {
			assert.equal(this.res1.length, 0);
		});

		it("after insert", function() {
			assert.equal(this.res2.length, 0);
		});

		it("after insert in tx", function() {
			assert.equal(this.res3[0].a, 3);
		});

		it("after rollback", function() {
			assert.equal(this.res4.length, 0);
		});
	});

	describe("ROLLBACK on UPDATE", function() {
		before(function(done) {
			t = this;
			db.load.test1({
				a__eq: 1
			}, "id", function(err, res) {
				t.err = err;
				if(err)
					return done();
				t.res1 = res;
				db.begin(function(err, tx) {
					t.err = err;
					if(err)
						return done();
					tx.load.test1({
						id: t.res1[0].id
					}, function(err, res) {
						t.err = err;
						if(err)
							return done();
						res[0].b = "ccc";
						res[0].save(function(err) {
							t.err = err;
							if(err)
								return done();
							db.load.test1({
								id: t.res1[0].id
							}, function(err, res) {
								t.err = err;
								if(err)
									return done();
								t.res2 = res;
								tx.load.test1({
									id: t.res1[0].id
								}, function(err, res) {
									t.err = err;
									if(err)
										return done();
									t.res3 = res;
									tx.rollback(function(err) {
										t.err = err;
										if(err)
											return done();
										db.load.test1({
											id: t.res1[0].id
										}, function(err, res) {
											t.err = err;
											t.res4 = res;
											done();
										});
									});
								});
							});
						});
					});
				});
			});
		});

		it("err is null", function() {
			assert.ifError(this.err);
		});

		it("beginning", function() {
			assert.equal(this.res1[0].b, "aaa");
		});

		it("after update", function() {
			assert.equal(this.res2[0].b, "aaa");
		});

		it("after update in tx", function() {
			assert.equal(this.res3[0].b, "ccc");
		});

		it("after rollback", function() {
			assert.equal(this.res4[0].b, "aaa");
		});
	});

	describe("ROLLBACK on DELETE", function() {
		before(function(done) {
			t = this;
			db.load.test1({
				a__eq: 1
			}, "id", function(err, res) {
				t.err = err;
				if(err)
					return done();
				t.res1 = res;
				db.begin(function(err, tx) {
					t.err = err;
					if(err)
						return done();
					tx.load.test1({
						id: t.res1[0].id
					}, function(err, res) {
						t.err = err;
						if(err)
							return done();
						res[0].del(function(err) {
							t.err = err;
							if(err)
								return done();
							db.load.test1({
								id: t.res1[0].id
							}, function(err, res) {
								t.err = err;
								if(err)
									return done();
								t.res2 = res;
								tx.load.test1({
									id: t.res1[0].id
								}, function(err, res) {
									t.err = err;
									if(err)
										return done();
									t.res3 = res;
									tx.rollback(function(err) {
										t.err = err;
										if(err)
											return done();
										db.load.test1({
											id: t.res1[0].id
										}, function(err, res) {
											t.err = err;
											t.res4 = res;
											done();
										});
									});
								});
							});
						});
					});
				});
			});
		});

		it("err is null", function() {
			assert.ifError(this.err);
		});

		it("beginning", function() {
			assert.equal(this.res1[0].b, "aaa");
		});

		it("after delete", function() {
			assert.equal(this.res2[0].b, "aaa");
		});

		it("after delete in tx", function() {
			assert.equal(this.res3.length, 0);
		});

		it("after rollback", function() {
			assert.equal(this.res4[0].b, "aaa");
		});
	});

	describe("COMMIT on UPDATE", function() {
		before(function(done) {
			t = this;
			db.load.test1({
				a__eq: 1
			}, "id", function(err, res) {
				t.err = err;
				if(err)
					return done();
				t.res1 = res;
				db.begin(function(err, tx) {
					t.err = err;
					if(err)
						return done();
					tx.load.test1({
						id: t.res1[0].id
					}, function(err, res) {
						t.err = err;
						if(err)
							return done();
						res[0].b = "ccc";
						res[0].save(function(err) {
							t.err = err;
							if(err)
								return done();
							db.load.test1({
								id: t.res1[0].id
							}, function(err, res) {
								t.err = err;
								if(err)
									return done();
								t.res2 = res;
								tx.load.test1({
									id: t.res1[0].id
								}, function(err, res) {
									t.err = err;
									if(err)
										return done();
									t.res3 = res;
									tx.commit(function(err) {
										t.err = err;
										if(err)
											return done();
										db.load.test1({
											id: t.res1[0].id
										}, function(err, res) {
											t.err = err;
											t.res4 = res;
											done();
										});
									});
								});
							});
						});
					});
				});
			});
		});

		it("err is null", function() {
			assert.ifError(this.err);
		});

		it("beginning", function() {
			assert.equal(this.res1[0].b, "aaa");
		});

		it("after update", function() {
			assert.equal(this.res2[0].b, "aaa");
		});

		it("after update in tx", function() {
			assert.equal(this.res3[0].b, "ccc");
		});

		it("after commit", function() {
			assert.equal(this.res4[0].b, "ccc");
		});
	});

	describe("COMMIT on DELETE", function() {
		before(function(done) {
			t = this;
			db.load.test1({
				a__eq: 1
			}, "id", function(err, res) {
				t.err = err;
				if(err)
					return done();
				t.res1 = res;
				db.begin(function(err, tx) {
					t.err = err;
					if(err)
						return done();
					tx.load.test1({
						id: t.res1[0].id
					}, function(err, res) {
						t.err = err;
						if(err)
							return done();
						res[0].del(function(err) {
							t.err = err;
							if(err)
								return done();
							db.load.test1({
								id: t.res1[0].id
							}, function(err, res) {
								t.err = err;
								if(err)
									return done();
								t.res2 = res;
								tx.load.test1({
									id: t.res1[0].id
								}, function(err, res) {
									t.err = err;
									if(err)
										return done();
									t.res3 = res;
									tx.commit(function(err) {
										t.err = err;
										if(err)
											return done();
										db.load.test1({
											id: t.res1[0].id
										}, function(err, res) {
											t.err = err;
											t.res4 = res;
											done();
										});
									});
								});
							});
						});
					});
				});
			});
		});

		it("err is null", function() {
			assert.ifError(this.err);
		});

		it("beginning", function() {
			assert.equal(this.res1[0].b, "ccc");
		});

		it("after delete", function() {
			assert.equal(this.res2[0].b, "ccc");
		});

		it("after delete in tx", function() {
			assert.equal(this.res3.length, 0);
		});

		it("after commit", function() {
			assert.equal(this.res4.length, 0);
		});
	});

	describe("ROLLBACK on UPDATE foreing key", function() {
		before(function(done) {
			t = this;
			db.load.test2({}, function(err, res) {
				t.err = err;
				if(err)
					return done();
				t.res0 = res;
				res[0].bLoad(function(err, res) {
					t.err = err;
					if(err)
						return done();
					t.res1 = res;
					db.begin(function(err, tx) {
						t.err = err;
						if(err)
							return done();
						tx.load.test2({}, function(err, res) {
							t.err = err;
							if(err)
								return done();
							res[0].bLoad(function(err, res) {
								t.err = err;
								if(err)
									return done();
								res[0].b = "ccc";
								res[0].save(function(err) {
									t.err = err;
									if(err)
										return done();
									db.load.test1({
										id: t.res0[0].b
									}, function(err, res) {
										t.err = err;
										if(err)
											return done();
										t.res2 = res;
										tx.load.test1({
											id: t.res0[0].b
										}, function(err, res) {
											t.err = err;
											if(err)
												return done();
											t.res3 = res;
											tx.rollback(function(err) {
												t.err = err;
												if(err)
													return done();
												db.load.test1({
													id: t.res0[0].b
												}, function(err, res) {
													t.err = err;
													t.res4 = res;
													done();
												});
											});
										});
									});
								});
							});
						});
					});
				});
			});
		});

		it("err is null", function() {
			assert.ifError(this.err);
		});

		it("beginning", function() {
			assert.equal(this.res1[0].b, "bbb");
		});

		it("after update", function() {
			assert.equal(this.res2[0].b, "bbb");
		});

		it("after update in tx", function() {
			assert.equal(this.res3[0].b, "ccc");
		});

		it("after rollback", function() {
			assert.equal(this.res4[0].b, "bbb");
		});
	});

	describe("LOCK", function() {
		before(function(done) {
			t = this;
			t.steps = [];
			db.begin(function(err, tx) {
				t.err = err;
				if(err)
					return done();
				tx.lock.test1({
					id: 2
				}, function(err, res) {
					t.err = err;
					if(err)
						return done(err);
					db.begin(function(err, tx) {
						t.err = err;
						if(err)
							return done(err);
						tx.lock.test1({
							id: 2
						}, function(err, res) {
							if(err)
								return done(err);
							t.steps.push("selected");
							setTimeout(tx.rollback.bind(tx, done), 50);
						});
					});
					setTimeout(function() {
						t.steps.push("pre rollback");
						tx.rollback(function() {});
					}, 50);
				});
			});
		});

		it("err is null", function() {
			assert.ifError(this.err);
		});

		it("pre rollback", function() {
			assert.equal(this.steps[0], "pre rollback");
		});

		it("selected", function() {
			assert.equal(this.steps[1], "selected");
		});
	});

	describe("LOCK foreing key", function() {
		before(function(done) {
			t = this;
			t.steps = [];
			db.begin(function(err, tx) {
				t.err = err;
				if(err)
					return done();
				tx.load.test2({}, function(err, res) {
					t.err = err;
					if(err)
						return done();
					res[0].bLock(function(err) {
						t.steps.push("locked");
						t.err = err;
						if(err)
							return done();
						setTimeout(tx.rollback.bind(tx, function() {}), 50);
					});
				});
				setTimeout(function() {
					db.begin(function(err, tx) {
						t.err = err;
						if(err)
							return done();
						tx.load.test2({}, function(err, res) {
							t.steps.push("selected");
							t.err = err;
							if(err)
								return done();
							res[0].bLock(function(err) {
								t.steps.push("relocked");
								t.err = err;
								if(err)
									return done();
								setTimeout(tx.rollback.bind(tx, function() {
									t.steps.push("post rollback");
									done();
								}), 50);
							});
						});
					});
				}, 50);
			});
		});

		it("err is null", function() {
			assert.ifError(this.err);
		});

		it("locked", function() {
			assert.equal(this.steps[0], "locked");
		});

		it("selected", function() {
			assert.equal(this.steps[1], "selected");
		});

		it("relocked", function() {
			assert.equal(this.steps[2], "relocked");
		});

		it("post rollback", function() {
			assert.equal(this.steps[3], "post rollback");
		});
	});
});
