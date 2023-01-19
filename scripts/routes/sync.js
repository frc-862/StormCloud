var express = require('express');
var router = express.Router();
var db = require('../database.js');
var authTools = require('../tools/authHelper.js');
const bodyParser = require('body-parser');
const JWT = require('jsonwebtoken');


let environment = "test";


// this sync system is meant to provide a simplistic way to sync data between devices without a ton of overhead data


/**
 * @api {get} /sync/matches Get matches
 * @apiName GET Matches
 * @apiGroup Sync
 */

router.get("/matches*", async (req, res) => {
    
    var env = await authTools.getEnvironment(environment);

    var teamNumber = req.query.teamNumber;

    var applicableMatches = (await db.getDocs("Match", {environment: env.friendlyId})).filter(m => m.teams.find(t => t.team == teamNumber) != undefined);
    
    var sendBackMatches = [];
    applicableMatches.forEach(m => {

        var sendBackMatch = {
            matchNumber: m.matchNumber,
            matchType: m.matchType,
            teams: m.teams,
            team: team
        }

        sendBackMatches.push(sendBackMatch);
    });



})


module.exports = router;