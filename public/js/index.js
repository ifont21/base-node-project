var socket = io();

const herokuHost = 'https://rocky-dusk-73853.herokuapp.com/';
const localhost = 'http://localhost:3000/';

socket.on('connect', function () {
	console.log('connected to server!');
});

socket.on('disconnect', function () {
	console.log('disconnected from server!');
});

socket.on('userLoggedIn', function (user) {
	console.log(`this user is now online ${user.username}`);
	var li = $('<li></li>');
	li.text(user.username);
	$('#usersOnline').append(li);
});

socket.on('welcome', function (message) {
	console.log(message);
});

$("#signinForm").on('submit', function (e) {
	e.preventDefault();
	var username = $('[name=username]').val();
	$.ajax({
		type: 'POST',
		url: herokuHost + 'login',
		contentType: 'application/json',
		data: JSON.stringify({ username: username }),
		success: function (data) {
			if (data.username) {
				$('#welcome').text('welcome to this game ' + data.username);
				socket.emit('online', { username: data.username });
			}
		},
		dataType: 'json'
	});
});