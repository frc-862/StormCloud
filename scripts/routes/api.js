var express = require('express');
var router = express.Router();
var db = require('../database.js');
var authTools = require('../tools/authHelper.js');
var firstApiTools = require('../tools/firstApi.js');
var bodyParser = require('body-parser');
let environment = "test";
var fs = require('fs');


/**
 * @api {get} /api/ Get base API information
 * @apiName GET API
 * @apiGroup API
 */


router.get('/', function(req, res, next) {
    res.json({message: "Welcome to the StormCloud API!", account: false, version: "0.0.1"});
});


/**
 * @api {get} /api/matches* Get a list of matches based on information provided
 * @apiName GET Matches
 * @apiGroup Matches
 * @param {String} [competition] The competition to get matches from (optional)
 */
router.get('/matches*', async function(req, res, next) {
    let env = await authTools.getEnvironment(environment);
    let token = req.cookies.token;

    var authorized = await authTools.authorize(token, "READ_ALL", env);
    if(!authorized){
        res.status(401).json({message: "Unauthorized"});
        return;
    }

    var matches = await db.getDocs("Match", {environment: env.friendlyId});
    var teams = await db.getDocs("Team", {environment: env.friendlyId});

    var documents = await db.getDocs("Document", {environment: env.friendlyId, dataType: "match"});
    // copy documents array
    var allDocuments = documents.slice(0);

    var sendBackMatches = [];
    var sendBackTeams = [];
    matches.forEach(match => {
        var matchData = {
            environment: match.environment,
            competition: match.competition,
            matchNumber: match.matchNumber,
            teams: match.teams,
            locked: match.locked,
            documents: [],
            _id: match._id
        }


        documents.forEach(doc => {
            if(match.documents.includes(doc._id.toString())){
                matchData.documents.push(doc);
                
            }
        })
        sendBackMatches.push(matchData);

        match.teams.forEach(team => {
            if(teams.filter(t => t.teamNumber == team).length == 0){
                sendBackTeams.push({teamNumber: team, name: "Unknown Team", environment: match.environment});
            }
        })
    });
    
   


    res.json({matches: sendBackMatches, allDocuments: allDocuments});
});

/**
 * @api {post} /api/match/document Add a document to a match
 * @apiName POST Match Document
 * @apiGroup Matches
 * @param {String} matchId The ID of the match to add the document to
 * @param {String} docId The ID of the document to add to the match
 */
router.post("/match/document", async (req, res, next) => {
    let env = await authTools.getEnvironment(environment);

    var token = req.cookies.token;

    var authorized = await authTools.authorize(token, "ASSOCIATE", env);
    if(!authorized){
        res.status(401).json({message: "Unauthorized"});
        return;
    }
    var matchId = req.body.matchId;
    var match = (await db.getDocs("Match", {_id: matchId, environment: env.friendlyId}))[0];
    if(match == undefined){
        res.status(404).json({message: "Match not found!"});
        return;
    }

    var docId = req.body.docId;
    console.log(docId);
    var docs = await db.getDocs("Document", {_id: docId, environment: env.friendlyId});
    if(docs.length == 0){
        res.status(404).json({message: "Document not found!"});
        return;
    }
    match.documents.push(docId);

    await db.updateDoc("Match", {_id: match._id}, {documents: match.documents});
    res.status(200).json({message: "Document added!"});

});

/**
 * @api {delete} /api/match/document Remove a document from a match
 * @apiName DELETE Match Document
 * @apiGroup Matches
 * @param {String} matchId The ID of the match to remove the document from
 * @param {String} docId The ID of the document to remove
 */
router.delete("/match/document", async (req, res, next) => {
    let env = await authTools.getEnvironment(environment);

    var token = req.cookies.token;


    var authorized = await authTools.authorize(token, "ASSOCIATE", env);
    if(!authorized){
        res.status(401).json({message: "Unauthorized"});
        return;
    }

    var matchId = req.body.matchId;
    var match = (await db.getDocs("Match", {_id: matchId}))[0];
    if(match == undefined){
        res.status(404).json({message: "Match not found!"});
        return;
    }

    var docId = req.body.docId;
    match.documents = match.documents.filter(doc => doc != docId);

    await db.updateDoc("Match", {_id: match._id}, {documents: match.documents});
    res.status(200).json({message: "Document removed!"});

});

/**
 * @api {post} /api/match Create a new match
 * @requires WRITE_ALL permission
 * @apiName POST Match
 * @apiGroup Matches
 * @param {String} competition The competition the match is in
 * @param {Number} matchNumber The match number
 * @param {Array} teams The teams in the match
 * @param {Boolean} locked Whether the match is locked
 * @param {Date} date The date time of the match
 */
router.post("/match", async (req, res, next) => {
    let env = await authTools.getEnvironment(environment);

    var token = req.cookies.token;

    var authorized = await authTools.authorize(token, "WRITE_ALL", env);
    if(!authorized){
        res.status(401).json({message: "Unauthorized"});
        return;
    }

    var competition = req.body.competition;
    var matchNumber = req.body.matchNumber;
    var teams = req.body.teams;
    var locked = req.body.locked;
    var date = req.body.date;

    var match = {
        environment: env.friendlyId,
        competition: competition,
        matchNumber: matchNumber,
        teams: teams,
        locked: locked,
        documents: [],
        date: date
    }

    await db.createDoc("Match", match);
    res.status(200).json({message: "Match created!"});

});

/**
 * @api {delete} /api/match Delete a match
 * @requires DELETE_ALL permission
 * @apiName DELETE Match
 * @apiGroup Matches
 * @param {String} matchId The match ID to delete
 */

router.delete("/match", async (req, res, next) => {
    let env = await authTools.getEnvironment(environment);

    var token = req.cookies.token;

    var authorized = await authTools.authorize(token, "DELETE_ALL", env);
    if(!authorized){
        res.status(401).json({message: "Unauthorized"});
        return;
    }

    var matchId = req.body.matchId;

    await db.deleteDoc("Match", {_id: matchId});
    res.status(200).json({message: "Match deleted!"});

});


/**
 * @api {get} /api/teams Gets all of the KNOWN teams in the application database
 * @apiName GET Teams
 * @apiGroup Teams
 * */
router.get("/teams", async (req, res, next) => {
    let env = await authTools.getEnvironment(environment);

    // just informational for the user's convienence, serves no actual purpose...
    var teams = await db.getDocs("Team");
    res.status(200).json(teams);
});


/**
 * @api {post} /api/document Create a new document
 * @apiName POST Document
 * @apiGroup Documents
 * @param {String} dataType The name of the document
 * @param {String} json The data of the document (as applicable to the dataType) in JSON
 * @param {String} image The image of the document (as applicable to the dataType) in base64
 */
router.post("/document", async (req, res, next) => {
    let env = await authTools.getEnvironment(environment);

    var token = req.cookies.token;
    var dataType = req.body.dataType;
    var authorized = await authTools.authorize(token, "WRITE_" + dataType.toUpperCase(), env);
    if(!authorized){
        res.status(401).json({message: "Unauthorized"});
        return;
    }

    var document = {
        environment: env.friendlyId,
        dataType: dataType,
        json: req.body.json,
        image: req.body.image,
        datetime: new Date()
    }

    var doc = await db.createDoc("Document", document);
    res.status(200).json({message: "Document created!", document: doc});
});

/**
 * @api {delete} /api/document Delete a document, no matter its associations to matches
 * @requires DELETE_ALL permission
 * @apiName DELETE Document
 * @apiGroup Documents
 * @param {String} docId The document ID to delete
 */

router.delete("/document", async(req, res, next) => {
    let env = await authTools.getEnvironment(environment);

    var token = req.cookies.token;
    var dataType = req.body.dataType;
    var authorized = await authTools.authorize(token, "DELETE_ALL", env);
    if(!authorized){
        res.status(401).json({message: "Unauthorized"});
        return;
    }

    var docId = req.body.docId;
    await db.deleteDoc("Document", {_id: docId});
    res.status(200).json({message: "Document deleted!"});
});

/**
 * @api {put} /api/document Edit a document's contents and data. You cannot modify the dataType of a document
 * @requires DELETE_ALL permission
 * @apiName DELETE Document
 * @apiGroup Documents
 * @param {String} docId The document ID to delete
 */

router.put("/document", async (req, res, next) => {
    let env = await authTools.getEnvironment(environment);

    var token = req.cookies.token;
    
    var authorized = await authTools.authorize(token, "EDIT_ALL", env);
    if(!authorized){
        res.status(401).json({message: "Unauthorized"});
        return;
    }

    

    var docId = req.body.docId;

    var document = (await db.getDocs("Document", {_id: docId}))[0];

    if(document == undefined){
        res.status(404).json({message: "Document not found!"});
        return;
    }

    var image = req.body.image;
    if(image == undefined){
        image = document.image;
    }
    var json = req.body.json;
    if(json == undefined){
        json = document.json;
    }

    await db.updateDoc("Document", {_id: docId}, {image: image, json: json, datetime: new Date()});
    res.status(200).json({message: "Document updated!"});
})

/**
 * @api {get} /api/environment Gets data from the current environment...
 * @apiName GET Environment
 * @apiGroup Environment
 */
router.get("/environment", async function(req, res, next) {
    var env = await authTools.getEnvironment(environment);
    var schemas = await db.getDocs("Schema", {});
    var setup = !(authTools.isEnvironmentSetup(env));
    console.log(setup);
    res.json({environment: env, needsSetup: setup, schemas: schemas});
});

router.post('/environment/setup', async function(req, res, next) {
    var env = await authTools.getEnvironment(environment);
    console.log(req.body);
    var password = req.body.password;
    var setupPassword = await authTools.setMasterPassword("", password, env);

    if(setupPassword){
        res.json({message: "Password set!"});
    }else{
        res.status(500).json({message: "Failed to set password!"});
    }
});

/**
 * @api {post} /api/schema Create a new schema
 * @apiName POST Schema
 * @apiGroup Schemas
 */
router.post("/schema", async (req, res, next) => {
    var env = await authTools.getEnvironment(environment);

    var name = req.body.name;
    var data = req.body.data;

    var docs = await db.getDocs("Schema", {Name: name});
    if(docs.length > 0){
        await db.updateDoc("Schema", {Name: name}, {Parts: data, Updated: new Date()});
        res.status(200).json({message: "Schema updated!"});
        return;
    }
    db.createDoc("Schema", {Name: name, Parts: data, Updated: new Date()});
    res.status(200).json({message: "Schema created!"});
});

router.get("/schemas", async (req, res, next) => {
    var env = await authTools.getEnvironment(environment);

    var docs = await db.getDocs("Schema", {});
    res.json({schemas: docs});
}); 

/**
 * @api {get} /api/schema Get a schema
 * @apiName GET Schema
 * @apiGroup Schemas
 */
router.get("/schema*", async (req, res, next) => {
    var env = await authTools.getEnvironment(environment);

    var name = req.query.name;
    var docs = await db.getDocs("Schema", {Name: name});
    if(docs.length > 0){
        res.status(200).json({schema: docs[0]});
        return;
    }
    res.status(404).json({message: "Schema not found!"});
});



/**
 * @api {get} /api/settings Get the settings for the current environment
 * @apiName GET Settings
 * @apiGroup Settings
 */
router.get("/settings", async (req, res, next) => {
    var env = await authTools.getEnvironment(environment);

    res.json({settings: env.settings});
})

/**
 * @api {post} /api/setting Sets the value of a setting for the current environment
 * @apiName POST Setting
 * @apiGroup Settings
 */
router.post("/setting", async (req, res, next) => {
    var env = await authTools.getEnvironment(environment);

    var key = req.body.key;
    var value = req.body.value;

    env.settings[key] = value;
    await db.updateDoc("Environment", {friendlyId: env.friendlyId}, {settings: env.settings});
    res.status(200).json({message: "Setting updated!"});
});



/**
 * @api {get} /api/setup Gets the setup configuration for a new device
 * @apiName GET Setup
 * @apiGroup Setup
 */
router.get("/setup", async (req, res, next) => {
    var env = await authTools.getEnvironment(environment);


    var settings = env.settings;
    if(settings == undefined || settings["selectedSchema"] == undefined){
        res.status(500).json({message: "No schema selected!"});
        return;
    }

    var schema = (await db.getDocs("Schema", {Name: settings["selectedSchema"]}));
    if(schema.length == 0){
        res.status(500).json({message: "Selected schema not found!"});
        return;
    }
    schema = schema[0];
   
    res.json({settings: settings, schema: schema});
}); 

router.post("/submit/photo", async (req, res, next) => {
    var env = await authTools.getEnvironment(environment);


    var fName = req.body.name.split(" ")[0] + "__" + req.body.name.split(" ")[1];

    var path = process.env.HOME_FOLDER + "/images/" + fName + ".png";
    console.log(path);
    var image = req.body.image;
    var team = req.body.team;
    var identifier = req.body.identifier;
    var matches = JSON.parse(req.body.matches);
    console.log(matches);

    res.status(200).json({message: "Data submitted!"});
  
    let b =  Buffer.from(image,'base64');
    console.log(b);
    fs.writeFile(path,b,async function(err){
        if(!err){
            console.log("file is created");

            var allDocs = await db.getDocs("Document", {environment: env.friendlyId});
            var prevDoc = allDocs.find((doc) => JSON.parse(doc.json).identifier == identifier);

            var generatedData = {
                team: team,
                completed: true,
                path: fName,
                identifier: identifier,
                type: "photo"
            }

            if(prevDoc != undefined){
                await db.updateDoc("Document", {_id: prevDoc._id}, {json: JSON.stringify(generatedData), datetime: new Date()});
                return;
            }

            
            var document = {
                environment: env.friendlyId,
                dataType: "match",
                json: JSON.stringify(generatedData),
                datetime: new Date()
            }

            var doc = await db.createDoc("Document", document);

            console.log(doc);
            var possibleMatches = await db.getDocs("Match", {environment: env.friendlyId});
            console.log(possibleMatches);
            console.log(matches);
            if(matches != undefined){
                console.log("WORK");
                matches.forEach(async (match) => {
                    console.log("Match: " + match)
                    var associatedMatch = possibleMatches.find((m) => m.matchNumber == match);
                    console.log("Associated: " + associatedMatch);
                    if(associatedMatch != undefined){
                        associatedMatch.documents.push(doc._id);
    
                        await db.updateDoc("Match", {_id: associatedMatch._id}, {documents: associatedMatch.documents});
                    }
                });
            }
            
        }
        console.log(err);
    });
});

router.post("/submit/paper", async (req, res, next) => {
    var env = await authTools.getEnvironment(environment);


    var fName = req.body.name.split(" ")[0] + "__" + req.body.name.split(" ")[1];

    var path = process.env.HOME_FOLDER + "/images/" + fName + ".png";
    console.log(path);
    var image = req.body.image;
    var team = req.body.team;
    var identifier = req.body.identifier;
    var matches = JSON.parse(req.body.matches);
    console.log(matches);

    res.status(200).json({message: "Data submitted!"});
  
    let b =  Buffer.from(image,'base64');
    console.log(b);
    fs.writeFile(path,b,async function(err){
        if(!err){
            console.log("file is created");

            var allDocs = await db.getDocs("Document", {environment: env.friendlyId});
            var prevDoc = allDocs.find((doc) => JSON.parse(doc.json).identifier == identifier);

            var generatedData = {
                team: team,
                completed: true,
                path: fName,
                identifier: identifier,
                type: "paper",
                matches: matches
            }

            if(prevDoc != undefined){
                await db.updateDoc("Document", {_id: prevDoc._id}, {json: JSON.stringify(generatedData), datetime: new Date()});
                return;
            }

            
            var document = {
                environment: env.friendlyId,
                dataType: "match",
                json: JSON.stringify(generatedData),
                datetime: new Date()
            }

            var doc = await db.createDoc("Document", document);

            console.log(doc);
            var possibleMatches = await db.getDocs("Match", {environment: env.friendlyId});
            console.log(possibleMatches);
            console.log(matches);
            if(matches != undefined){
                console.log("WORK");
                matches.forEach(async (match) => {
                    console.log("Match: " + match)
                    var associatedMatch = possibleMatches.find((m) => m.matchNumber == match);
                    console.log("Associated: " + associatedMatch);
                    if(associatedMatch != undefined){
                        associatedMatch.documents.push(doc._id);
    
                        await db.updateDoc("Match", {_id: associatedMatch._id}, {documents: associatedMatch.documents});
                    }
                });
            }
            
        }
        console.log(err);
    });







    // TODO: Add files to the server's public directory and then add reference to them to the database
    
});

/**
 * @api {post} /api/submit/data Submits data documents from a device
 * @apiName POST Submit Data
 * @apiGroup Submit
 */
//TODO: Add authentication
router.post("/submit/data", async (req, res, next) => {
    var env = await authTools.getEnvironment(environment);

    var dataPieces = JSON.parse(req.body.documents);

    for(var i = 0; i < dataPieces.length; i++){
        var dataPiece = dataPieces[i];

        var generatedData = {
            team: dataPiece.Team,
            completed: true,
            data: dataPiece.Data,
            author: dataPiece.Scouter,
            schema: dataPiece.Schema,
            deviceId: dataPiece.DeviceID,
            identifier: dataPiece.Identifier,
            match: dataPiece.Number,
            type: "tablet"
        }

        var allDocs = await db.getDocs("Document", {environment: env.friendlyId});
        var prevDoc = allDocs.find((doc) => JSON.parse(doc.json).identifier == dataPiece.Identifier);
        if(prevDoc != undefined){
            await db.updateDoc("Document", {_id: prevDoc._id}, {json: JSON.stringify(generatedData), datetime: new Date(dataPiece.Created)});
            continue;
        }


        var document = {
            environment: env.friendlyId,
            dataType: "match",
            json: JSON.stringify(generatedData),
            datetime: new Date(dataPiece.Created)
        }

        var associatedMatch = await db.getDocs("Match", {environment: env.friendlyId, matchNumber: dataPiece.Number});

        


        var doc = await db.createDoc("Document", document);
        console.log(doc);

        if(associatedMatch.length > 0){
            associatedMatch = associatedMatch[0];
            associatedMatch.documents.push(doc._id);

            await db.updateDoc("Match", {_id: associatedMatch._id}, {documents: associatedMatch.documents});
        }

    }
    

    res.status(200).json({message: "Data submitted!"});
});



router.get("/first/ping", async (req, res, next) => {
    var env = await authTools.getEnvironment(environment);

    var fRes = await firstApiTools.testConnectivity();

    res.status(fRes ? 200 : 500).json({connected: fRes});
});

router.get("/first/teams*", async(req, res, next) => {
    var env = await authTools.getEnvironment(environment);

    var year = req.query.year;
    var competition = req.query.competition;
    var doNotPush = req.query.doNotPush == "true";

    var fRes = await firstApiTools.getTeams(year, competition);

    var path = process.env.HOME_FOLDER + "/cache/" + "teams.json";
    var sendBackFRes = JSON.stringify(fRes);
    res.status(fRes.error == undefined ? 200 : 500).json({data: sendBackFRes});

    if(fRes.error == undefined && !doNotPush){
        fs.writeFile(path, sendBackFRes, (err) => {

        });

        var teams = fRes["teams"];
        teams.forEach(async (team) => {
            var existingTeam = await db.getDocs("Team", {environment: env.friendlyId, teamNumber: team.teamNumber});
            if(existingTeam.length > 0){
                return;
            }

            var teamNumber = team.teamNumber;
            var newTeam = {
                environment: env.friendlyId,
                teamNumber: teamNumber,
                name: team.nameShort,
                notes: [],
                extraData: {}
            }

            await db.createDoc("Team", newTeam);



        });
    }
})

router.get("/first/schedule*", async (req, res, next) => {
    var env = await authTools.getEnvironment(environment);




    var year = req.query.year;
    var competition = req.query.competition;
    var matchType = req.query.matchType;

    
    console.log("Match Type: " + matchType)
    console.log("Year: " + year)
    console.log("Competition: " + competition)


    if(matchType != "Qualification" && matchType != "Playoff" && matchType != "Practice" && matchType != "None"){
        matchType = "Qualification";
    }

    var doNotPush = req.query.doNotPush == "true";

    var fRes = await firstApiTools.getSchedule(year, competition, matchType);

    var path = process.env.HOME_FOLDER + "/cache/" + "schedule.json";
    var sendBackFRes = JSON.stringify(fRes);

    res.status(fRes.error == undefined ? 200 : 500).json({data: sendBackFRes});


    if(fRes.error == undefined && !doNotPush){
        var contents = JSON.stringify(fRes);
        fs.writeFile(path, contents, (err) => {

        });

        var schedule = fRes["Schedule"];
        schedule.forEach(async (match) => {


            var existingMatch = await db.getDocs("Match", {environment: env.friendlyId, matchNumber: match["matchNumber"], competition: competition});
            if(existingMatch.length > 0){
                return;
            }

            var matchNumber = match["matchNumber"];
            var teams = [];
            match["teams"].forEach((team) => {
                teams.push({
                    team: team["teamNumber"],
                    color: team["station"].substring(0, team["station"].length - 1)
                });
            });

            var date = new Date(match["startTime"]);

            var match = {
                environment: env.friendlyId,
                competition: competition,
                matchNumber: matchNumber,
                teams: teams,
                locked: false,
                documents: [],
                date: date
            }

            await db.createDoc("Match", match);

        });


    }

    
});


module.exports = router;