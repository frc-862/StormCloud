var express = require('express');
var db = require('./scripts/database.js');
var dotenv = require('dotenv');
dotenv.config();
const port = process.env.PORT || 3000;
const parser = require('body-parser');
const cookieParser = require('cookie-parser');
var app = express();
console.log(process.env.DB_PW);
db.init(process.env.DB_PW);
db.testAddData();

var environment = "test";

app.use(express.static(__dirname + '/public'));
app.use(parser.json());
app.use(cookieParser());
app.get("/", function(req, res) {
    res.sendFile(__dirname + "/views/main.html");
})

app.get("/scouting*", function(req, res) {
    res.sendFile(__dirname + "/views/scouting.html");
})

// direct all API requests to the API router
app.use('/api', require('./scripts/routes/api.js'));
app.use('/auth', require('./scripts/routes/auth.js'));

app.listen(port, function() {
    console.log("Server started @ localhost:" + port);
});