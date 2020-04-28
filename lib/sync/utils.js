"use strict";

function getTable(pgo) {
  return pgo.schema.tables[pgo.schema.tidx];
}

function singleStep(pgo, table, query, code, next, field) {
  pgo.log(query);
  pgo.client.query(query, null, function(err, res) {
    if(pgo.error(err, code, table.name, field ? field : null)) return;

    next(pgo);
  });
}

module.exports = {
  getTable:   getTable,
  singleStep: singleStep,
};
