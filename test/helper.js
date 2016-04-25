/* jshint mocha: true */
"use strict";

var logs = [];
var pg   = require("pg");
var Pgo  = require("../lib/pgo");
var pgoc = {};

if(! process.env.PGO_TEST_DB)
	throw new Error("Can't run tests without test database connection string in process.env.PGO_TEST_DB");

function cleanCounter() {
	pgoc.connect = 0;
	pgoc.done = 0;
}

cleanCounter();

function cleanLogs() {
	logs.length = 0;
}

function clean(db, callback) {
	cleanCounter();
	cleanLogs();

	db.client(function(err, client, done) {
		client.query("DROP SEQUENCE test1s_id_seq CASCADE", null, function(err, res) {
			if(err && err.code != "42P01")
				throw err;

			client.query("DROP TABLE test1s CASCADE", null, function(err, res) {
				if(err && err.code != "42P01")
					throw err;

				client.query("DROP SEQUENCE test2s_id_seq CASCADE", null, function(err, res) {
					if(err && err.code != "42P01")
						throw err;

					client.query("DROP TABLE test2s CASCADE", null, function(err, res) {
						if(err && err.code != "42P01")
							throw err;

						client.query("DROP TABLE test3s CASCADE", null, function(err, res) {
							if(err && err.code != "42P01")
								throw err;

							done();
							callback();
						});
					});
				});
			});
		});
	});
}

function newPgo() {
	var newpgo = new Pgo(process.env.PGO_TEST_DB, function(msg) {
		logs.push(msg);
	});

	newpgo.pgoCounter = pgoc;

	return newpgo;
}

var oldConnect = pg.connect;

pg.connect = function(db, cbk) {
	pgoc.connect++;

	return oldConnect.call(pg, db, function(err, client, done) {
		cbk(err, client, function() {
			pgoc.done++;
			done();
		});
	});
};

module.exports = {
	clean: clean,
	cleanCounter: cleanCounter,
	cleanLogs: cleanLogs,
	logs: logs,
	newPgo: newPgo,
	pgo: Pgo,
	pgoc: pgoc,
};
