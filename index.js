require('dotenv').config()
const express = require("express")
const cors = require("cors")
const helmet = require("helmet")

const { error } = require("./middleware/exceptionHandler")

const parcels = require("./routes/parcel")
const users = require("./routes/users")
const signup = require("./auth/signup")
const login = require("./auth/login")

const app = express()

app.use(cors())
app.use(helmet())
app.use(express.json())

app.use("/api/v2/auth",signup,login)
app.use("/api/v2/parcels",parcels)
app.use("/api/v2/users/",users)

app.use(error)


const port = process.env.PORT || 3100

app.listen(port,err=>{
    if (err) {
        throw err
    }
    console.log(`Server running on http://localhost:${port}`)
})