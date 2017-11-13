const express = require('express');
const http = require('http');
const { mongoose } = require('./db/mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const socketIO = require('socket.io');
const redis = require('redis');
const { Player, Challenge } = require('./db/models/index');

const port = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const client = redis.createClient();

client.on('connect', () => {
	console.log('redis connected!');
});

io.on('connection', (socket) => {
	console.log('New user connected!');

	socket.emit('getOnlines', { init: true, session: parseResult(client.smembers('online')) });

	socket.on('fetchChallenges', () => {
		client.smembers('challenges', (err, reply) => {
			if (err) return console.log(err);
			let result = parseResult(reply);
			console.log(result);
			socket.emit('getChallenges', { init: true, challenges: result });
		});
	});

	socket.on('online', (user) => {
		let sessionObj = {};
		sessionObj.user = user.username;
		sessionObj.socket = socket.id;
		let sessionObjString = JSON.stringify(sessionObj);
		client.sadd(['onlineUsernames', user.username], (err, result) => {
			if (err) return console.log(err);
			if (result === 1) {
				client.sadd(['online', sessionObjString], (err, result) => {
					if (err) return console.log(err);
					if (result === 1) {
						console.log('OK!');
					}
				});
				client.smembers('online', (err, reply) => {
					if (err) return console.log(err);
					let resultJSON = parseResult(reply);
					io.emit('getOnlines', { init: false, session: resultJSON });
				});
			}
		});
		socket.broadcast.emit('userLoggedIn', {
			username: user.username
		});
	});

	socket.on('challenger', (challenge) => {
		const challengerObj = {
			challenged: challenge.challenged,
			challenger: challenge.challenger,
			accept: false
		};
		client.sadd(['challenges', JSON.stringify(challengerObj)], (err, result) => {
			if (err) return console.log(err);
			if (result === 1) {
				client.smembers('challenges', (err, reply) => {
					if (err) return console.log(err);
					let resultJSON = parseResult(reply);
					socket.broadcast.emit('getChallenges', {
						init: false,
						challenges: resultJSON
					});
				});
			}
		});
		socket.emit('getOnlines', { init: true, session: parseResult(client.smembers('online')) });
	});

	socket.on('startChallenge', (challenge) => {
		io.emit('loadChallenge', {
			challenge: challenge
		});
	});

	socket.on('setNumber', (data) => {
		socket.broadcast.emit('setOpponentNumber', data);
	});

	socket.on('readyToPlay', (data) => {
		socket.broadcast.emit('loadPlay', data);
	})

	socket.on('turn', (data) => {
		socket.broadcast.emit('turnPlay', data);
	});

	socket.on('loser', (data) => {
		socket.broadcast.emit('lostPlayer', data);
	});

	socket.on('disconnect', function () {
		client.smembers('online', (err, reply) => {
			if (err) return console.log(err);
			let onlineJSON = parseResult(reply);
			const item = onlineJSON.filter((item) => {
				return item.socket === socket.id;
			})[0];
			if (item) {
				client.srem(['onlineUsernames', item.user], (err, result) => {
					if (err) return console.log(err);
					if (result === 1) {
						let itemToDelete = getItemByResult(reply, item.user);
						client.srem(['online', itemToDelete], (err, result) => {
							if (err) return console.log(err);
							if (result === 1) {
								client.smembers('online', (err, reply) => {
									if (err) return console.log(err);
									let onlineJSON = parseResult(reply);
									io.emit('getOnlines', { init: false, session: onlineJSON });
								});
							}
						});

					}
				});
			}
		});
	});

});

app.use(bodyParser.json());

app.use(express.static(`${__dirname}/public`));


//fetch online users *******************************************************************************
app.get('/users/online', (req, res) => {
	Player.find({ 'online': true }).then((doc) => {
		console.log('session', $session);
		res.status(200).send(doc);
	}, (err) => {
		res.status(500).send(err);
	});
});

// put online users *********************************************************************************
app.put('/online', (req, res) => {
	Player.findOne({ 'username': req.body.username }).then((doc) => {
		console.log('player', doc);
		doc.online = true;
		doc.save().then((save) => {
			res.status(200).send(save);
		}, (err) => {
			res.status(500).send(err);
		});
	}, (err) => {
		res.status(500).send(err);
	})
});

//offline users *********************************************************************************
app.put('/offline', (req, res) => {
	Player.findOne({ 'username': req.body.username }).then((doc) => {
		console.log('player', doc);
		doc.online = false;
		doc.save().then((res) => {
			res.status(200).send(res);
		}, (err) => {
			res.status(500).send(err);
		});
	}, (err) => {
		res.status(500).send(err);
	})
});



// create players and login **************************************************************************
app.post('/players', (req, res) => {
	const player = new Player({
		username: req.body.username
	});

	player.save().then((doc) => {
		res.send(doc);
	}, (error) => {
		res.status(400).send(error);
	});
});

//login to play ***************************************************************************************
app.post('/login', (req, res) => {
	Player.findOne({ 'username': req.body.username }).then((player) => {
		res.send(player);
	}, (err) => {
		res.status(500).send(err);
	});
});

// deal a challenge *********************************************************************************
app.post('/challenges', (req, res) => {
	const challenge = new Challenge();
	Player.find({
		"$or": [
			{ "username": req.body.challengerOne },
			{ "username": req.body.challengerTwo }
		]
	}).then((players) => {
		if (players.length === 2) {
			challenge.challengerOne.player = players[0];
			challenge.challengerTwo.player = players[1];
			challenge.save().then((doc) => {
				res.status(201).send(doc);
			}, (error) => {
				res.status(400).send(error);
			});
		} else {
			res.status(500).send('a challenger not found')
		}
	}, (error) => {
		res.status(500).send(error);
	});
});

//verify exist user online 
const verifyExistUser = (user, session) => {
	let exist = false;
	for (let sess in session) {
		if (user === session[sess].user) {
			exist = true;
			break;
		}
	}
	return exist;
}

const parseResult = (array) => {
	const arrayResult = [];
	for (let item in array) {
		arrayResult.push(JSON.parse(array[item]));
	}
	return arrayResult;
}

const getItemByResult = (reply, username) => {
	let element = '';
	if (reply.length > 0) {
		reply.forEach((item) => {
			if (item.includes(username)) {
				element = item;
				return;
			}
		});
		return element;
	}

	return arrayResult;
}

app.get('/', (req, res) => {
	res.send('Hello world this is Node');
});


server.listen(port, () => {
	console.log(`Server is up on port ${port}`);
});