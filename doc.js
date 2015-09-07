"use strict";

String.prototype.href = function() {
	return this.toLowerCase().replace(/ /g, "-");
};

String.prototype.level = function() {
	if(!this.search(/^####/))
		return 0;

	if(!this.search(/^###/))
		return 3;

	if(!this.search(/^##/))
		return 2;

	if(!this.search(/^#/))
		return 1;

	return 0;
};

String.prototype.repeat = function(count) {
	if(count < 1)
		return "";

	return new Array(count + 1).join(this);
};

String.prototype.title = function() {
	return this.replace(/^#+ ?/, "").replace(/ ?$/, "");
};

function getMarkers(lines) {
	var begin = true;
	var end = true;
	var ret = [0, 0];

	for(var l in lines) {
		if(lines[l] == "[comment]: <> (doc begin)") {
			begin = false;
			ret[0] = parseInt(l);
		}
		if(lines[l] == "[comment]: <> (doc end)") {
			end = false;
			ret[1] = parseInt(l);
		}
	}

	return begin || end ? false : ret;
}

var fs = require("fs");
var files = fs.readdirSync("doc");
var version = JSON.parse(fs.readFileSync("package.json", "utf8")).version;

for(var i in files) {
	var lines = fs.readFileSync("doc/" + files[i], "utf8").split("\n");
	var markers = getMarkers(lines);

	if(! markers) {
		console.log("Missing markers: " + files[i]);

		continue;
	}

	var out = [];
	var toc = [];
	var hdr = [
		"",
		" | |",
		":-|:-:|-:",
		"__Version: " + version + "__ | [Home](Home.md) | [Versions Index](https://bitbucket.org/cicci/node-postgres-orm/src/master/doc/Index.md)",
		""
	];

	var level = 0;
	var foundOne = false;
	var foundTwo = false;

	for(var l in lines) {
		if(l < markers[0] || l > markers[1])
			continue;

		var lvl = lines[l].level();

		if(!lvl)
			continue;

		var tit = lines[l].title();

		if(lvl == 1) {
			level = 0;
			toc.push("- [" + tit + "](#markdown-header-" + tit.href() + ")");
			foundOne = true;
			foundTwo = false;
		}

		if(lvl == 2) {
			level = foundOne ? 1 : 0;
			toc.push("    ".repeat(level) + "- [" + tit + "](#markdown-header-" + tit.href() + ")");
			foundTwo = true;
		}

		if(lvl == 3) {
			level = (foundOne ? 1 : 0) + (foundTwo ? 1 : 0);
			toc.push("    ".repeat(level) + "- [" + tit + "](#markdown-header-" + tit.href() + ")");
		}
	}

	for(var l in hdr)
		out.push(hdr[l]);

	if(toc.length > 3) {
		for(var l in toc)
			out.push(toc[l]);

		out.push("");
	}

	for(var l in lines)
		if(l >= markers[0] && l <= markers[1])
			out.push(lines[l]);

	for(var l in hdr)
		out.push(hdr[l]);

	fs.writeFileSync("doc/" + files[i], out.join("\n"), "utf8");
}
