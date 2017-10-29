const express = require('express');
const http = require('http');
const { mongoose } = require('./db/mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const socketIO = require('socket.io');
const { Player, Challenge } = require('./db/models/index');

const port = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

let $session = [];
let $challenges = [];

app.use(session({ secret: 'ssshhhhh' }));

io.on('connection', (socket) => {
	console.log('New user connected!');

	socket.emit('getOnlines', { init: true, session: $session });
	socket.emit('getChallenges', { init: true, challenges: $challenges });

	socket.on('online', (user) => {
		let sessionObj = {};
		sessionObj.user = user.username;
		sessionObj.socket = socket.id;
		if (!verifyExistUser(user, $session)) {
			$session.push(sessionObj);
		}
		io.emit('getOnlines', { init: false, session: $session });

		socket.broadcast.emit('userLoggedIn', {
			username: user.username
		});
	});

	socket.on('challenger', (challenge) => {
		$challenges.push({
			challenged: challenge.challenged,
			challenger: challenge.challenger,
			accept: false
		});
		socket.broadcast.emit('getChallenges', {
			init: false,
			challenges: $challenges
		});
		socket.emit('getOnlines', { init: false, session: $session });
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

	socket.on('disconnect', function () {
		let i = getSocketId(socket.id, $session);
		if (typeof i === 'number') {
			$session.splice(i, 1);
		}
		io.emit('getOnlines', { init: false, session: $session });
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

const getSocketId = (socket, session) => {
	let position;
	for (let i = 0; i < session.length; i++) {
		if (socket === session[i].socket) {
			position = i;
			break;
		}
	}
	return position;
}

app.get('/', (req, res) => {
	res.send('Hello world this is Node');
});


server.listen(port, () => {
	console.log(`Server is up on port ${port}`);
});