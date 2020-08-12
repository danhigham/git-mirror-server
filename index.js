var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http, {path: '/socket/'});

const { uniqueNamesGenerator, adjectives, colors, animals } = require('unique-names-generator');

const redis = require("redis");
const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPassword = process.env.REDIS_PASSWORD;

const redisClient = redis.createClient({
	host: redisHost, 
	password: redisPassword
});

redisClient.on("error", function(error) {
	console.error(error);
});

app.get('/join/:session', function(req, res){
	res.redirect("/?session_name=" + req.params["session"])
});

app.get('/join', function(req, res){
	randomName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] }); // big_red_donkey
	res.redirect("/join/" + randomName)
});

io.on('connection', (socket) => {

	// join the room
	socket.on('join', (room) => {
		console.log('joining room ' + room)
		socket.join(room)

		redisClient.lrange(room, 0, -1, (err, data) => {
			if (err) {
				console.log(err);
				return;
			}
		 
			data.forEach(msg => {
				socket.emit('blocks-update', JSON.parse(msg))
			});
		});
	});

	socket.on('blocks-update', (msg) => {
		var rooms = Object.keys(socket.rooms);
		var lastRoom = rooms[rooms.length-1]
		console.log('sending to room ' + lastRoom)

		socket.to(lastRoom).emit('blocks-update', msg);

		redisClient.rpush(lastRoom, JSON.stringify(msg))		
		console.log(msg);
	});
	
	console.log('a user connected');
});

http.listen(3000, () => {
	  console.log('listening on *:3000');
});
