var socket = io();

const herokuHost = 'https://rocky-dusk-73853.herokuapp.com/';
const localhost = 'http://localhost:3000/';

let onlines = [];
var numberOpponent = null;
var myNumber = null;
var readyToPlay = false;

var myAttempts = [];
var opponentAttempts = [];
var myTurn = false;

socket.on('connect', function () {
	console.log('connected to server!');
});

socket.on('disconnect', function () {
	console.log('disconnected from server!');
});

socket.on('getOnlines', function (data) {
	console.log('Fetch Online Users', data);
	var userlogged = $('#userLogged').val();
	var sessions = data.session;
	var arraySession = sessions.filter(function (item) {
		return item.user !== userlogged;
	});
	if (data.init) {
		for (var item in arraySession) {
			var li = $('<li></li>');
			var anchor = $('<a href="javascript:void(0)" onclick="toChallenge(\'' + arraySession[item].user + '\')">' + arraySession[item].user + '</a>');
			li.append(anchor);
			$('#usersOnline').append(li);
		}
	} else {
		$('#usersOnline').html('');
		for (var item in arraySession) {
			var li = $('<li></li>');
			var anchor = $('<a href="javascript:void(0)" onclick="toChallenge(\'' + arraySession[item].user + '\')">' + arraySession[item].user + '</a>');
			li.append(anchor);
			$('#usersOnline').append(li);
		}
	}

});

socket.on('loadChallenge', function (challenge) {
	var userlogged = $('#userLogged').val();
	var challengerOne = challenge.challenge.challenge.challengerOne.player.username;
	var challengerTwo = challenge.challenge.challenge.challengerTwo.player.username;
	if (challengerOne === userlogged || challengerTwo == userlogged) {
		$('.challenge').css('display', 'block');
		$('.challengerLogged').text(userlogged);
		$('.challengerOther').text(challengerOne === userlogged ? challengerTwo : challengerOne);
		$('.challenges').css('display', 'none');
	}
});

socket.on('getChallenges', function (data) {
	console.log('*********** challenges ***************');
	console.log(data);
	var userlogged = $('#userLogged').val();
	var challenges = data.challenges;
	var arrayChallenges = challenges.filter(function (item) {
		return item.challenged === userlogged;
	});
	if (data.init) {
		for (var item in arrayChallenges) {
			var li = $('<li></li>');
			var anchor = $('<a href="javascript:void(0)" onclick="acceptChallenge(\'' + arrayChallenges[item].challenger + '\')">' + arrayChallenges[item].challenger + '</a>');
			li.append(anchor);
			$('#challengers').append(li);
		}
	} else {
		$('#challengers').html('');
		for (var item in arrayChallenges) {
			var li = $('<li></li>');
			var anchor = $('<a href="javascript:void(0)" onclick="acceptChallenge(\'' + arrayChallenges[item].challenger + '\')">' + arrayChallenges[item].challenger + '</a>');
			li.append(anchor);
			$('#challengers').append(li);
		}
	}
});

socket.on('setOpponentNumber', function (data) {
	var opponent = $('.challengerOther').text();
	if (data.opponent === opponent) {
		numberOpponent = data.number;
	}
	$('.opponent-ready').css('display', 'block');
	if (myNumber && numberOpponent) {
		readyToPlay = true;
		socket.emit('readyToPlay', true);
		socket.emit('turn', {
			opponent: data.opponent,
			turn: true
		});
	}
	if (readyToPlay) {
		$('.attempt-number').css('display', 'block');
		$('input[name=attempt]').prop('disabled', true);
	}
});

socket.on('loadPlay', function (data) {
	readyToPlay = data;
	if (readyToPlay) {
		$('.attempt-number').css('display', 'block');
	}
});

socket.on('turnPlay', function (data) {
	var userlogged = $('#userLogged').val();
	if (data.opponent === userlogged) {
		myTurn = data.turn;
	}
	if (myTurn) {
		$('input[name=attempt]').prop('disabled', false);
	}
});

socket.on('lostPlayer', function (data) {
	var userlogged = $('#userLogged').val();
	if (userlogged === data) {
		$('.challenge').css('display', 'none');
		$('.loser').css('display', 'block');
	}
});

socket.on('welcome', function (message) {
	console.log(message);
});
//create new user *******************************************************
$("#signupForm").on('submit', function (e) {
	e.preventDefault();
	var username = $('[name=username_new]').val();
	$.ajax({
		type: 'POST',
		url: localhost + 'players',
		contentType: 'application/json',
		data: JSON.stringify({ username: username }),
		success: processUserLogedIn,
		dataType: 'json'
	});
});


//login existin user ****************************************************
$("#signinForm").on('submit', function (e) {
	e.preventDefault();
	var username = $('[name=username]').val();
	$.ajax({
		type: 'POST',
		url: localhost + 'login',
		contentType: 'application/json',
		data: JSON.stringify({ username: username }),
		success: processUserLogedIn,
		dataType: 'json'
	});
});


function processUserLogedIn(data) {
	if (data.username) {
		$('#welcome').text('welcome to this game ' + data.username);
		$('.form-section').css('display', 'none');
		$('#userLogged').val(data.username);
		socket.emit('online', { username: data.username });
		socket.emit('fetchChallenges');
		$('.online-users').css('display', 'block');
		$('.challenges').css('display', 'block');
	}
}

function addOnlineUserToList(username) {
	onlines.push(username);
	$.ajax({
		type: 'PUT',
		url: localhost + 'online',
		contentType: 'application/json',
		data: JSON.stringify({ username: username }),
		success: function (data) {
			socket.emit('setOnlines', true);
		},
		dataType: 'json'
	});
}
function setNumber() {
	myNumber = $('input[name=number]').val();
	socket.emit('setNumber', {
		number: myNumber,
		opponent: $('#userLogged').val()
	});
	$('.number-game').text(myNumber);
	$('.choose-number').css('display', 'none');
}

function setAttempt() {
	var myAttempt = $('input[name=attempt]').val();
	var opponent = $('.challengerOther').text();
	var results = getPointsAndFames(numberOpponent, myAttempt);
	if (results.fames === 4) {
		$('.challenge').css('display', 'none');
		$('.winner').css('display', 'block');
		socket.emit('loser', opponent);
		return;
	}

	var attempObj = {
		number: myAttempt,
		points: results.points,
		fames: results.fames
	};
	myAttempts.push(attempObj);
	$('#attemptList').html('');
	for (var item in myAttempts) {
		var li = $('<li></li>');
		var attemptInfo = $('<div>Number: ' + myAttempts[item].number + ' Points: ' + myAttempts[item].points + ' Fame: ' + myAttempts[item].fames + '</div>');
		li.append(attemptInfo);
		$('#attemptList').append(li);
	}
	myTurn = false;
	socket.emit('turn', {
		opponent: $('.challengerOther').text(),
		turn: true
	});
	$('input[name=attempt]').prop('disabled', true);
}


function toChallenge(challenged) {
	var confirm = window.confirm('do you want to challenge this player ?');
	var userLogged = $('#userLogged').val();
	if (confirm) {
		socket.emit('challenger', {
			challenged: challenged,
			challenger: userLogged
		});
	}
}

function acceptChallenge(challenger) {
	var confirm = window.confirm('do you want to accept the challenge ?');
	var userLogged = $('#userLogged').val();
	var payload = {
		challengerOne: challenger,
		challengerTwo: userLogged
	};
	if (confirm) {
		$.ajax({
			type: 'POST',
			url: localhost + 'challenges',
			contentType: 'application/json',
			data: JSON.stringify(payload),
			success: function (data) {
				socket.emit('startChallenge', {
					challenge: data
				});
			},
			dataType: 'json'
		});
	}
}

function getPointsAndFames(number, attempt) {
	var countPoints = 0;
	var countFames = 0;
	if (number.length === 4 && attempt.length === 4) {
		number.split('').forEach(function (element, index) {
			attempt.split('').forEach(function (elAttempt, iAttempt) {
				if (element === elAttempt) {
					if (index === iAttempt) {
						countFames++;
					} else {
						countPoints++;
					}
				}
			});
		});
	}
	return {
		points: countPoints,
		fames: countFames
	}
}

$(document).ready(function () {
	$('.online-users').css('display', 'none');
	$('.challenges').css('display', 'none');
	$('.challenge').css('display', 'none');
	$('.opponent-ready').css('display', 'none');
	$('.attempt-number').css('display', 'none');
	$('.winner').css('display', 'none');
	$('.loser').css('display', 'none');
});