var express = require('express');
const port = process.env.PORT || 3000;
var app = express();


app.use(express.static(__dirname + '/public'));
app.get("/", function(req, res) {
    res.sendFile(__dirname + "/views/main.html");
})

app.get("/scouting*", function(req, res) {
    res.sendFile(__dirname + "/views/scouting.html");
})
app.listen(port, function() {
    console.log("Server started @ localhost:" + port);
});