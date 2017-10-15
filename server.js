const express = require('express');

var app = express();

app.use(express.static(`${__dirname}/public`));

app.get('/', (req, res) => {
	res.send('Hello world this is Node');
});


app.listen(3000);