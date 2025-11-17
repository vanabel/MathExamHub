const mongoose = require('mongoose');

const options = {

};

mongoose.connect('mongodb://localhost/mathexam', options)
  .then( () => {
    console.log('Connected to MongoDB');
  })
  .catch( (error) => {
    console.error('MongoDb connection error:', error);
  });

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
