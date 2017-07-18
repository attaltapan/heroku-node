var http = require('http');
var url = require('url');
var mysql = require('mysql');
var qs = require('querystring');

var port = 8080;

var query_hospital = 'SELECT hospital_info.hospital_id,hospital_info.hospital_name, MAX(bin_info.bin_status) AS bin_status FROM hospital_info, bin_info WHERE hospital_info.hospital_id= bin_info.hospital_id group by hospital_id;';
var query_building = 'SELECT building_info.hospital_id,building_info.building_id ,building_info.building_name, MAX(bin_info.bin_status) AS bin_status FROM building_info, bin_info WHERE building_info.building_id= bin_info.building_id group by building_id;';
var query_floor = 'SELECT floor_info.floor_position,floor_info.hospital_id,floor_info.building_id,floor_info.floor_id,floor_info.floor_name, MAX(bin_info.bin_status) AS bin_status FROM floor_info, bin_info WHERE floor_info.floor_id= bin_info.floor_id group by floor_id;';
var query_room = 'SELECT room_info.room_name,room_info.room_id,room_info.floor_id, MAX(bin_info.bin_status) AS bin_status FROM room_info, bin_info WHERE room_info.room_id = bin_info.room_id group by room_id;';
var query_bin = 'SELECT * from bin_info;';
var query_user_start = 'SELECT user_name from login_info where user_name = "'
var query_user = '"and password = "';
var query_user_end = '"';

var dbpool = mysql.createPool({
	connectionLimit: 10,
	host:'127.0.0.1', 
	user: 'root',
	password: 'password',
	database: 'stryker_bin',
    insecureAuth:true
});

console.log('DatabaseView::Starting nodejs server...');

http.createServer(function(request,response) {
		console.log('');
		console.log('DatabaseView::httpRequest -->');
		var urlparts = url.parse(request.url, true);
		var sqlquery = '';
		var username = '';
		var password = '';
		var jsonFinalResults = '';
		
		console.log('DatabaseView::requestURL:' + request.url);
		console.log('DatabaseView::requestMethod:' + request.method);
		
		if (request.method == 'POST') {
			var body = '';
			request.on('data', function (data) {
				body += data;
				if (body.length > 1e6)
					request.connection.destroy();
			});

			request.on('end', function () {
				var post = qs.parse(body);
				username = post.user_name;
				password = post.password;
			});
		} else if (request.method == 'GET') {
			username = urlparts.query.username;
			password = urlparts.query.password;
		}
		
		if (urlparts.pathname == '/hospitals') {
			sqlquery = query_hospital;
		} else if (urlparts.pathname == '/buildings') {
			sqlquery = query_building;
		} else if (urlparts.pathname == '/floors') {
			sqlquery = query_floor;
		} else if (urlparts.pathname == '/rooms') {
			sqlquery = query_room;
		} else if (urlparts.pathname == '/bins') {
			sqlquery = query_bin;
		} else if (urlparts.pathname == '/login') {
			dbpool.getConnection(function (err,dbconnection) {
				if (err) throw err;
				dbconnection.query(query_user_start + username + query_user + password + query_user_end,function(err,results, fields) {
						if (err) throw err;
						console.log(results);
						var jsonResults = JSON.stringify(results)
						console.log('DatabaseView::jsonResults:' + jsonResults);
						if (jsonResults.indexOf(username) != -1) {
						//	jsonFinalResults = '[{"status":"Success","message","User logged in successfully"}]';
							jsonFinalResults["status"] = "Success";
							jsonFinalResults["message"] = "User logged in successfully";
						} else {
						//	jsonFinalResults = '[{"status":"Error","message","Invalid username or password specified."}]';
							jsonFinalResults["status"] = "Error";
							jsonFinalResults["message"] = "Invalid username or passsword specified.";
						}
						response.writeHead(200, {'Content-Type':'text/json'});
						console.log('DatabaseView::finalResponse:' + jsonFinalResults);
						response.write(JSON.stringify(jsonFinalResults));
						response.end();
						dbconnection.release();
				});
			});
			return;
		}
		if (sqlquery != '') {
			console.log('DatabaseView::sqlquery:' + sqlquery);
			dbpool.getConnection(function (err,dbconnection) {
				if (err) throw err;
				dbconnection.query(sqlquery,function(err,results, fields) {
						if (err) throw err;
                        console.log(results);
						var jsonResults = JSON.stringify(results);
						console.log('DatabaseView::jsonResults:' + jsonResults);
						var jsonStart = jsonResults.split('[{');
						var jsonEnd = jsonStart[1].split('}]');
						var jsonPairs = jsonEnd[0].split(',');
						var jsonNewPairs = '';
						for (var i=0; i < jsonPairs.length; i++) {
							var jsonNameValue = jsonPairs[i].split(':');
							var jsonNewNameValue = jsonNameValue[0] + ':';
							if (jsonNameValue[1].indexOf('"') == -1) {
								if (jsonNameValue[1].indexOf('}') == -1) {
									jsonNewNameValue = jsonNewNameValue + '"' + jsonNameValue[1] + '"';
								} else {
									jsonNewNameValue = jsonNewNameValue + '"' + jsonNameValue[1].split('}')[0] + '"}';
								}
							} else {
								jsonNewNameValue = jsonNewNameValue + jsonNameValue[1];
							}
							if (i == 0) {
								jsonNewPairs = jsonNewNameValue;
							} else {
								jsonNewPairs = jsonNewPairs + ',' + jsonNewNameValue;
							}
						}
						jsonFinalResults = '[{' + jsonNewPairs + '}]';
						console.log('DatabaseView::finalResponse:' + jsonFinalResults);
						response.writeHead(200, {'Content-Type':'text/json'});
						response.write(jsonFinalResults);
						response.end();
						dbconnection.release();
				});
			});
		} else {
			response.writeHead(200, {'Content-Type':'text/json'});
			response.end();
		}
	console.log('DatabaseView::httpRequest <--');
}).listen(port);
console.log('DatabaseView::Listening...');
