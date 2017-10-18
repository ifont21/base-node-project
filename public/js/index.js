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

socket.on('getOnlines', function (emitted) {

	console.log('Fetch Online Users');
	$.ajax({
		type: 'GET',
		url: herokuHost + 'users/online',
		success: function (data) {
			console.log('online users', data);
			if (emitted.init) {
				for (var item in data) {
					var li = $('<li></li>');
					li.text(data[item].username);
					$('#usersOnline').append(li);
				}
			} else {
				$('#usersOnline').html('');
				for (var item in data) {
					var li = $('<li></li>');
					li.text(data[item].username);
					$('#usersOnline').append(li);
				}
			}


		},
		dataType: 'json'
	});

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
		url: herokuHost + 'players',
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
		url: herokuHost + 'login',
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
		addOnlineUserToList(data.username);
	}
}

function addOnlineUserToList(username) {
	onlines.push(username);
	$.ajax({
		type: 'PUT',
		url: herokuHost + 'online',
		contentType: 'application/json',
		data: JSON.stringify({ username: username }),
		success: function (data) {
			socket.emit('setOnlines', true);
		},
		dataType: 'json'
	});
}