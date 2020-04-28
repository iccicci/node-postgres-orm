"use strict";

var dd = require("double-done");

var errors = require("./errors");

function close(command, done) {
  this.pgo.log(command);
  this.client.query(command, err => {
    this.done();
    this.closed = true;
    for(var i in this.records) this.records[i].__tx = null;
    this.records = [];
    done(err);
  });
}

function commit(done, doneOk) {
  this.end("COMMIT", 1031, "commit", done, doneOk);
}

function end(command, error, method, done, doneOk) {
  doneOk = dd(done, doneOk);

  if(typeof done !== "function") throw new Error("Transaction." + method + ": done must be a function");

  if(this.closed) {
    return process.nextTick(
      done.bind(null, {
        pgo: {
          code:    error,
          doing:   errors[error],
          message: "Transaction." + method + ": Can't " + command + " an already closed Transaction",
        },
      })
    );
  }

  this.close(command, doneOk.dd(doneOk));
}

function rollback(done, doneOk) {
  this.end("ROLLBACK", 1032, "rollback", done, doneOk);
}

module.exports = {
  close:    close,
  commit:   commit,
  end:      end,
  rollback: rollback,
};
