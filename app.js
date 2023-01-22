var express = require('express');
var db = require('./scripts/database.js');
var dotenv = require('dotenv');
dotenv.config();
const port = process.env.PORT || 3000;
const parser = require('body-parser');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
var app = express();
console.log(process.env.DB_PW);
db.init(process.env.DB_PW);
db.testAddData();

process.env.HOME_FOLDER = __dirname;

var environment = "test";

app.use(express.static(__dirname + '/public'));

app.use(express.static(__dirname + '/images'));
app.use(bodyParser.json({limit: '4gb', extended: true}));
app.use(express.json({limit: '4gb'}));
app.use(express.urlencoded({limit: '4gb'}));
app.use(parser.json({limit: '4gb'}));
app.use(bodyParser.urlencoded({ extended: true, limit: '4gb' }));
app.use(cookieParser());
app.get("/", function(req, res) {
    res.sendFile(__dirname + "/views/main.html");
})

app.get("/login", function(req, res) {
    res.sendFile(__dirname + "/views/login.html");
})

app.get("/dataform", function(req, res) {
    res.sendFile(__dirname + "/views/dataform.html");
})

app.get("/setup", function(req, res) {
    res.sendFile(__dirname + "/views/setup.html"); 
});

// direct all API requests to the API router


app.use('/api', require('./scripts/routes/api.js'));
app.use('/auth', require('./scripts/routes/auth.js'));
app.use('/sync', require('./scripts/routes/sync.js'));

app.listen(port, function() {
    console.log("Server started @ localhost:" + port);
});