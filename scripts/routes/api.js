var express = require('express');
var router = express.Router();
var db = require('../database.js');
var authTools = require('../tools/authHelper.js');
var bodyParser = require('body-parser');
let environment = "test";



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

    var documents = await db.getDocs("Document", {environment: env.friendlyId, dataType: "match"});

    var sendBackMatches = [];
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
                documents.splice(documents.indexOf(doc), 1);
            }
        })
        sendBackMatches.push(matchData);
    });


    res.json({matches: sendBackMatches, unassignedDocuments: documents});
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
 * @api {get} /api/environment Gets data from the current environment...
 * @apiName GET Environment
 * @apiGroup Environment
 */
router.get("/environment", async function(req, res, next) {
    var env = await authTools.getEnvironment(environment);
    var setup = !(authTools.isEnvironmentSetup(env));
    console.log(setup);
    res.json({environment: env, needsSetup: setup});
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



module.exports = router;