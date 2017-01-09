if(process.env.PG_VERSION !== "9.6" || ! process.version.match(/^v6.1/))
	setTimeout(function() {}, 20000);
