const mongoose = require("mongoose")
// "mongodb://localhost/safecourier"
const connectionString = process.env.MONGO_DB_DEV_STRING 
mongoose.connect(connectionString,{ useNewUrlParser: true, useUnifiedTopology: true })
    .then(()=>console.log(`Db is successfully connected`))
    .catch(err=>console.error(err))






    
module.exports = mongoose