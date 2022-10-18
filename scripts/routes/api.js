var express = require('express');
var router = express.Router();
var db = require('../database.js');

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
    let env = environment;

    var matches = await db.getDocs("Match", {environment: env});

    var documents = await db.getDocs("Document", {environment: env, dataType: "match"});

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
            }
        })
        sendBackMatches.push(matchData);
    });


    res.json(sendBackMatches);
});


/**
 * @api {get} /api/environment Gets data from the current environment...
 * @apiName GET Environment
 * @apiGroup Environment
 */
router.get("/environment", async function(req, res, next) {
    var env = await db.getDocs("Environment", {friendlyId: environment});
    res.json(env[0]);
});

module.exports = router;