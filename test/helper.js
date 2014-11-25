/* jshint mocha: true */
'use strict';

var pgo  = require('../lib/pgo');
var logs = [];

if(! process.env.PGO_TEST_DB)
	throw new Error("Can't run tests without test database connection string in process.env.PGO_TEST_DB");

function cleanLogs() {
	logs.length = 0;
}

function clean(db, callback) {
	cleanLogs();

	db.client(function(err, client, done) {
		client.query("DROP SEQUENCE test1s_id_seq CASCADE", null, function(err, res) {
			if(err && err.code != '42P01')
				throw err;

			client.query("DROP TABLE test1s CASCADE", null, function(err, res) {
				if(err && err.code != '42P01')
					throw err;

				client.query("DROP SEQUENCE test2s_id_seq CASCADE", null, function(err, res) {
					if(err && err.code != '42P01')
						throw err;

					client.query("DROP TABLE test2s CASCADE", null, function(err, res) {
						if(err && err.code != '42P01')
							throw err;

						done();
						callback();
					});
				});
			});
		});
	});
}

module.exports = {
	clean:     clean,
	cleanLogs: cleanLogs,
	logs:      logs,
	newPgo:    function() { return new pgo(process.env.PGO_TEST_DB, function(msg) { logs.push(msg); }); },
	pgo:       pgo
};
