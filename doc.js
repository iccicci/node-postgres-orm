"use strict";

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
	var toc = [
		"",
		" | |",
		":-|:-:|-:",
		"__Version: " + version + "__ | [Home](Home.md) | [Versions Index](https://bitbucket.org/cicci/node-postgres-orm/src/master/doc/Index.md)",
		""
	];

	for(var l in toc)
			out.push(toc[l]);

	for(var l in lines)
		if(l >= markers[0] && l <= markers[1])
			out.push(lines[l]);

	for(var l in toc)
		out.push(toc[l]);

	fs.writeFileSync("doc/" + files[i], out.join("\n"), "utf8");
}

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
