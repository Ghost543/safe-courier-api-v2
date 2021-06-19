require('dotenv').config()
const express = require("express")
const cors = require("cors")
const helmet = require("helmet")
const swaggerUI = require("swagger-ui-express")
const swaggerJsDoc = require("swagger-jsdoc")

const { error } = require("./middleware/exceptionHandler")

const login = require("./auth/login")
const signup = require("./auth/signup")
const users = require("./routes/users")
const parcels = require("./routes/parcel")

const options = {
    definition: {
        openapi: "3.0.3",
        info: {
            title: "Safe Courier Api",
            version: "2",
            description: "Safe courier Api it is for managing parcel delivery orders and its users"
        },
        servers: [
            {
                url: "http://localhost:3100"
            }
        ]
    },
    apis: ["./routes/*.js","./auth/*.js"]
}
const specs = swaggerJsDoc(options)

const app = express()

app.use("/api-docs",swaggerUI.serve,swaggerUI.setup(specs))
app.use(cors())
app.use(helmet())
app.use(express.json())

app.use("/api/v2/auth",signup,login)
app.use("/api/v2/users/",users)
app.use("/api/v2/parcels",parcels)

app.use(error)


const port = process.env.PORT || 3100

app.listen(port,err=>{
    if (err) {
        throw err
    }
    console.log(`Server running on http://localhost:${port}`)
})