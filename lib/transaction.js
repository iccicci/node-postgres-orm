"use strict";

var errors = require("./errors");

function close(command, callback) {
	var t = this;

	this.pgo.log(command);
	this.client.query(command, function(err) {
		t.done();
		t.closed = true;
		for(var i in t.records)
			t.records[i].__tx = null;
		t.records = [];
		callback(err);
	});
}

function commit(callback) {
	if(typeof(callback) != "function")
		throw new Error("Transaction.commit: callback must be a function");

	if(this.closed)
		return process.nextTick(callback.bind(null, {
			pgo: {
				code:    1031,
				doing:   errors[1031],
				message: "Transaction.commit: Can't COMMIT an already closed Transaction"
			},
		}));

	this.close("COMMIT", callback);
}

function rollback(callback) {
	if(typeof(callback) != "function")
		throw new Error("Transaction.rollback: callback must be a function");

	if(this.closed)
		return process.nextTick(callback.bind(null, {
			pgo: {
				code:    1032,
				doing:   errors[1032],
				message: "Transaction.rollback: Can't ROLLBACK an already closed Transaction"
			},
		}));

	this.close("ROLLBACK", callback);
}

module.exports = {
	close:    close,
	commit:   commit,
	rollback: rollback,
};
