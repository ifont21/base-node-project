const mongoose = require('mongoose');

mongoose.Promise = global.Promise;
// mongoose.connect('mongodb://fontuser:Ign747212@ds161069.mlab.com:61069/point-fame');
mongoose.connect('mongodb://localhost:27017/point-fame');

module.exports = { mongoose };