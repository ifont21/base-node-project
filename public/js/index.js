var socket = io();

const herokuHost = 'https://rocky-dusk-73853.herokuapp.com/';
const localhost = 'http://localhost:3000/';

let onlines = [];

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
		$('.online-users').css('display', 'block');
		// addOnlineUserToList(data.username);
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

function toChallenge(challenged) {
	// console.log('challenger: ' + challenger + ' and challenged: ' + challenged);
	console.log('hereeee!' + challenged);
}

$(document).ready(function () {
	$('.online-users').css('display', 'none');
});