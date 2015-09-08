"use strict";

function arrayCompare(a1, a2) {
	if(a1.length != a2.length)
		return false;

	for(var i in a1)
		if(a2.indexOf(a1[i]) == -1)
			return false;

	return true;
}

function fieldType(field) {
	switch(field.type) {
	case "timestamptz":
		return "timestamptz(" + field.precision + ")";

	case "varchar":
		if(field.maxLen)
			return "varchar(" + field.maxLen + ")";
	}

	return field.type;
}

function getTable(pgo) {
	return pgo.schema.tables[pgo.schema.tidx];
}

function getField(pgo, table) {
	return table.fields[pgo.schema.fidx];
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
	arrayCompare: arrayCompare,
	fieldType: fieldType,
	getTable: getTable,
	getField: getField,
	singleStep: singleStep
};
