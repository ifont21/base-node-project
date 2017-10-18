const express = require('express');
const http = require('http');
const { mongoose } = require('./db/mongoose');
const bodyParser = require('body-parser');
const socketIO = require('socket.io');
const { Player, Challenge } = require('./db/models/index');

const port = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

io.on('connection', (socket) => {
	console.log('New user connected!');
	socket.on('disconnect', () => {
		console.log('user disconnected!!');
	});

	socket.emit('getOnlines', { init: true });

	socket.on('online', (user) => {
		socket.broadcast.emit('userLoggedIn', {
			username: user.username
		});
	});

	socket.on('setOnlines', (emitted) => {
		if (emitted) {
			io.emit('getOnlines', { init: false });
		}
	});

});

app.use(bodyParser.json());

app.use(express.static(`${__dirname}/public`));


//fetch online users *******************************************************************************
app.get('/users/online', (req, res) => {
	Player.find({ 'online': true }).then((doc) => {
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

app.get('/', (req, res) => {
	res.send('Hello world this is Node');
});


server.listen(port, () => {
	console.log(`Server is up on port ${port}`);
});