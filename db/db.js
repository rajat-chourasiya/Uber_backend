const mongoose = require('mongoose');
require('dotenv').config()

function connectToDb() {
    mongoose.connect(process.env.atlas_URL
    ).then(() => {
        console.log('Connected to DB');
    }).catch(err => console.log(err));
}


module.exports = connectToDb;