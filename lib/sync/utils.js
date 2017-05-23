"use strict";

function finalizeSync(query, pgo, errnr, table, name, next) {
	pgo.log(query);
	pgo.client.query(query, null, (err, res) => {
		if(pgo.error(err, errnr, table.name, name))
			return;

		next(pgo);
	});
}

function getTable(pgo) {
	return pgo.schema.tables[pgo.schema.tidx];
}

function singleStep(pgo, table, query, code, next, field) {
	pgo.log(query);
	pgo.client.query(query, null, function(err, res) {
		if(pgo.error(err, code, table.name, field ? field.name : null))
			return;

		next(pgo);
	});
}

module.exports = {
	finalizeSync: finalizeSync,
	getTable:     getTable,
	singleStep:   singleStep
};
