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


    var matches = await db.getDocs("Match", {environment: env.friendlyId, competition: env.settings.competitionYear + env.settings.competitionCode});
    var teams = await db.getDocs("Team", {environment: env.friendlyId});

    var documents = await db.getDocs("Document", {environment: env.friendlyId, dataType: "match", competition: env.settings.competitionYear + env.settings.competitionCode});
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
            results: match.results,
            documents: [],
            _id: match._id
        }


        documents.forEach(doc => {
            var docData = JSON.parse(doc.json);
            if(match.matchNumber == docData.matchNumber && match.competition == doc.competition){
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

router.get("/request/scouter*", async(req, res, next) => {
    let env = await authTools.getEnvironment(environment);

    var authValid = await authTools.checkPassword(req.query.authKey, env);

    var scouter = req.query.scouter;
    var competition = env.settings.competitionYear + env.settings.competitionCode;
    var sendBackDocuments = [];
    if(authValid){
        var documents = await db.getDocs("Document", {environment: env.friendlyId, dataType: "match", competition: competition});
        sendBackDocuments = documents.filter(doc => {
            var data = JSON.parse(doc.json);
            return data.scouter == scouter || data.author == scouter;
        })
    }
    
    
    res.json({documents: sendBackDocuments, auth: authValid});
});

router.get("/request/match*", async (req, res, next) => {
    let env = await authTools.getEnvironment(environment);

    var authValid = await authTools.checkPassword(req.query.authKey, env);

    var matchNumber = req.query.matchNumber;
    var competition = env.settings.competitionYear + env.settings.competitionCode;

    var matches = await db.getDocs("Match", {environment: env.friendlyId, competition: competition, matchNumber: matchNumber});
    if(matches.length == 0){
        res.status(404).json({message: "Match not found!"});
        return;
    }
    var match = matches[0];

    var sendBackMatch = {
        environment: match.environment,
        competition: match.competition,
        matchNumber: match.matchNumber,
        teams: match.teams,
        locked: match.locked,
        results: match.results,
        documents: [],
        _id: match._id
    }

    if(authValid){
        var documents = await db.getDocs("Document", {environment: env.friendlyId, dataType: "match", competition: competition});
        documents.forEach(doc => {
            var docData = JSON.parse(doc.json);
            if(match.matchNumber == docData.matchNumber && match.competition == doc.competition){
                sendBackMatch.documents.push(doc);
            }
        });
    }
    

    res.json({match: sendBackMatch, auth: authValid});

})

router.post("/request/document/flag*", async (req, res, next) => {
    let env = await authTools.getEnvironment(environment);


    var authValid = await authTools.checkPassword(req.query.authKey, env);

    if(!authValid){
        res.status(401).json({message: "Unauthorized"});
        return;
    }
    var documentId = req.body.docId;

    var documents = await db.getDocs("Document", {environment: env.friendlyId, _id: documentId});
    if(documents.length == 0){
        res.status(404).json({message: "Document not found!"});
        return;
    }
    var document = documents[0];
    document.flagged = req.body.flagged;
    await db.updateDoc("Document", {_id: document._id}, {flagged: document.flagged});
    res.json({message: "Document flagged!"});
});
router.post("/request/document/delete*", async (req, res, next) => {
    let env = await authTools.getEnvironment(environment);
    var authValid = await authTools.checkPassword(req.query.authKey, env);
    if(!authValid){
        res.status(401).json({message: "Unauthorized"});
        return;
    }

    var documentId = req.body.docId;
    var documents = await db.getDocs("Document", {environment: env.friendlyId, _id: documentId});
    if(documents.length == 0){
        res.status(404).json({message: "Document not found!"});
        return;
    }
    var document = documents[0];
    await db.deleteDoc("Document", {_id: document._id});
    res.json({message: "Document deleted!"});

});


function prepareAnalysis(analysis, schema, documents, matches, team){
    // replication of the HTML version
    
    var partSets = {};
    var requestedDataPoints = {};
    var schemaFields = [];
    schema.Parts.forEach((part) => {
        part.Components.forEach((component) => {
            if(component.Type == "Label"){
                return;
            }
            if(component.Type == "Check"){
                schemaFields.push({
                    part: part.Name,
                    component: component.Name,
                    componentType: component.Type,
                    on: component.On,
                    off: component.Off
                })
                return;
            }
            schemaFields.push({
                part: part.Name,
                component: component.Name,
                componentType: component.Type
            })
        });
    });

    var finalData = undefined;


    analysis.Parts.forEach((part) => {
        partSets[part._id] = {};
        
        switch(part.Type){
            case "Number":
                //request SchemaFields and FIRSTFields
                try{
                    part.Data["SchemaFields"].forEach((field) => {
                        if(requestedDataPoints[field] == undefined){
                            requestedDataPoints[field] = [part._id];
                        }else{
                            requestedDataPoints[field].push(part._id);
                        }
                    });
                }catch(e){
                    console.log(e);
                }

                try{
                    part.Data["FIRSTFields"].forEach((field) => {
                        if(requestedDataPoints[field] == undefined){
                            requestedDataPoints[field] = [part._id];
                        }else{
                            requestedDataPoints[field].push(part._id);
                        }
                    });
                }catch(e){
                    console.log(e);
                }
                
                break;
            case "Grid":
                // just request schemafields
                try{
                    part.Data["SchemaFields"].forEach((field) => {
                        if(requestedDataPoints[field] == undefined){
                            requestedDataPoints[field] = [part._id];
                        }else{
                            requestedDataPoints[field].push(part._id);
                        }
                    });
                }
                catch(e){
                    console.log(e);
                }
                break;
            case "FIRST":
                try{
                    if(requestedDataPoints[part.Data["DataPoint"]] == undefined){
                        requestedDataPoints[part.Data["DataPoint"]] = [part._id];
                    }else{
                        requestedDataPoints[part.Data["DataPoint"]].push(part._id);
                    }
                }catch(e){

                }
                // just request finalscore
        }
    });

    documents.forEach((doc) => {
        var data = JSON.parse(doc.json);
        // assume that we've already sorted the document

        if(!data.completed){
            return;
        }

        if(doc.flagged){
            return;
        }

        if(!(data.type == "tablet")){
            return;
        }
        if(!(data.schema == analysis.Schema.Name)){
            return;
        }

        schemaFields.forEach((field) => {
            var key = field.part + "---" + field.component;
            var indexOfField = schemaFields.indexOf(field);
            if(requestedDataPoints[key] == undefined){
                return;
            }

            var useData = JSON.parse(data.data)[indexOfField];

            requestedDataPoints[key].forEach((partId) => {
                var analysisPart = analysis.Parts.find(p => p._id == partId);
                if(field.componentType == "Step" || field.componentType == "Timer"){
                    // most likely just requesting number only
                    if(Object.keys(partSets[partId]).find(k => k == key)){
                        // then add to obj
                        partSets[partId][key].push(parseInt(useData))
                    }else{
                        // then create obj
                        partSets[partId][key] = [parseInt(useData)]
                    }
                }else if(field.componentType == "Check"){
                    // most likely just requesting number only
                    if(Object.keys(partSets[partId]).find(k => k == key)){
                        // then add to obj
                        partSets[partId][key].push(field.on == useData ? 1 : 0)
                    }else{
                        // then create obj
                        partSets[partId][key] = [field.on == useData ? 1 : 0]
                    }
                }else if(field.componentType == "Grid"){
                    // data point depends on the analysisPart type
                    var putData = 0;
                    switch(analysisPart.Type){
                        case "Number":
                            // then we are just requesting a number
                            var gridData = [];
                            var rowData = useData.split("*");
                            rowData.forEach((row) => {
                                var rowArr = row.split(",");
                                gridData = gridData.concat(rowArr);
                            });

                            var count = 0;
                            gridData.forEach((num) => {
                                if(parseInt(num) == indexOfField){
                                    count += 1;
                                }
                            });

                            putData = count;

                            

                            break;
                        case "Grid":
                            // we need the GRID ITSELF
                            var gridData = [];
                            var rowData = useData.split("*");
                            rowData.forEach((row) => {
                                var cols = row.split(",");  
                                var colsInt = [];
                                cols.forEach((col) => {
                                    if(parseInt(col) == indexOfField){
                                        colsInt.push(1);
                                    }else{
                                        colsInt.push(-1);
                                    }
                                });

                                gridData.push(colsInt);
                            });

                            putData = gridData;
                            break;

                    }
                    if(Object.keys(partSets[partId]).find(k => k == key)){
                        // then add to obj
                        partSets[partId][key].push(putData)
                    }else{
                        // then create obj
                        partSets[partId][key] = [putData]
                    }
                }

                // handle EACH PART ID AND ADDING DATA
                
            });

            
        });


    });

    matches.forEach((match) => {
        var foundTeam = match.teams.find(t => t.team == team);

        if(foundTeam == undefined){
            return;
        }
        if(!match.results.finished){
            return;
        }

        if(foundTeam.color == "Red"){
            var stats = match.results.redStats;
            Object.keys(stats).forEach((key) => {
                if(requestedDataPoints[key] == undefined){
                    return;
                }
                requestedDataPoints[key].forEach((partId) => {
                    // handle EACH PART ID AND ADDING DATA
                    if(Object.keys(partSets[partId]).find(k => k == key)){
                        // then add to obj
                        partSets[partId][key].push(stats[key])
                    }else{
                        // then create obj
                        partSets[partId][key] = [stats[key]]
                    }
                });
            });

            
        }else{
            var stats = match.results.blueStats;
            Object.keys(stats).forEach((key) => {
                if(requestedDataPoints[key] == undefined){
                    return;
                }
                requestedDataPoints[key].forEach((partId) => {
                    // handle EACH PART ID AND ADDING DATA
                    if(Object.keys(partSets[partId]).find(k => k == key)){
                        // then add to obj
                        partSets[partId][key].push(stats[key])
                    }else{
                        // then create obj
                        partSets[partId][key] = [stats[key]]
                    }
                });
            });
        }

        


    });

    finalData = [];

    Object.keys(partSets).forEach((partId) => {
        // now we condense

        var part = analysis.Parts.find(p => p._id == partId);
        var partData = partSets[partId];

        switch(part.Type){
            case "Number":
                var final = 0;
                var n = 0;

                var method = part.Data["Stat_Between"];
                var finalMethod = part.Data["Stat_Final"];

                // first, handle the statistical analysis of the individual parts
                Object.keys(partData).forEach((key) => {
                    try{
                        var localFinal = 0;

                        switch(method){
                            case "sum":
                                localFinal = partData[key].reduce((a, b) => a + b, 0);
                                break;
                            case "avg":
                                localFinal = partData[key].reduce((a, b) => a + b, 0) / partData[key].length;
                                break;
                            case "max":
                                localFinal = Math.max(...partData[key]);
                                break;
                            case "min":
                                localFinal = Math.min(...partData[key]);
                                break;
                            case "range":
                                localFinal = Math.max(...partData[key]) - Math.min(...partData[key]);
                                break;
                        }
                        n += 1;
                        final += localFinal;
                    }catch(e){
                        console.log(e);
                    }
                    
                });
                if(finalMethod == "avg"){
                    final = final / n;
                }
                finalData.push({
                    name: part.Name,
                    type: part.Type,
                    value: final
                });


                break;
            case "Grid":
                // get one grid for each team!
                var final = [];

                Object.keys(partData).forEach((key) => {
                    try{
                        if(partData[key].length == 0){
                            return;
                        }
                        var localFinalForAll = [];
                        
                        var height = partData[key][0].length;
                        var width = partData[key][0][0].length;

                        for(var i = 0; i < height; i++){
                            var row = [];
                            for(var j = 0; j < width; j++){
                                row.push(0);
                            }
                            localFinalForAll.push(row);
                        }

                        partData[key].forEach((grid) => {
                            grid.forEach((row, i) => {
                                row.forEach((col, j) => {
                                    var toAdd = 0;
                                    if(parseInt(grid[i][j]) != -1){
                                        toAdd = 1;
                                    }
                                    localFinalForAll[i][j] += toAdd;
                                });
                            });
                        });

                        final.push(localFinalForAll);
                    }catch(e){
                        // if it reaches here, then it is of a different size
                    }
                    
                });

                var max = 0;

                for(var i = 1; i < final.length; i++){
                    for(var r = 0; r < final[i].length; r++){
                        for(var c = 0; c < final[i][r].length; c++){
                            if(final[i][r][c] != -1){
                                final[0][r][c] += final[i][r][c];
                                
                            }
                        }
                    }
                }
                try{
                    for(var r = 0; r < final[0].length; r++){
                        for(var c = 0; c < final[0][r].length; c++){
                            if(final[0][r][c] > max){
                                max = final[0][r][c];
                            }
                        }
                    }
                }catch(e){

                }

                finalData.push({
                    name: part.Name,
                    type: part.Type,
                    value: final[0],
                    max: max
                });
                break;
        }
    });

    return finalData;





}


router.get("/request/team*", async(req, res, next) => {
    let env = await authTools.getEnvironment(environment);


    var authValid = await authTools.checkPassword(req.query.authKey, env);

    var teamNumber = req.query.teamNumber;
    var competition = env.settings.competitionYear + env.settings.competitionCode;

    var teams = await db.getDocs("Team", {environment: env.friendlyId, teamNumber: teamNumber});
    



    var documents = [];
    if(authValid){
        var teamDocs = await db.getDocs("Document", {environment: env.friendlyId, dataType: "match", competition: competition});

        teamDocs.forEach(doc => {
            var data = JSON.parse(doc["json"]);
            if(data["team"] == teamNumber){
                documents.push(doc);
            }
        });
    }
    
    var analysis = await db.getDocs("AnalysisSet", {environment: env.friendlyId});
    var defaultAnalysis = analysis.find(a => a.Name == env.settings.defaultAnalysis);

    var schema = undefined;
    if(defaultAnalysis != undefined){
        var schemas = await db.getDocs("Schema", {environment: env.friendlyId});
        schema = schemas.find(s => s.Name == defaultAnalysis.Schema.Name);
    }

    if(teams.length == 0){
        if(documents.length == 0){
            // there is no team
            res.status(404).json({message: "Team not found!"});
            return;
        }
        var matches = await db.getDocs("Match", {environment: env.friendlyId, competition: competition});
        var sendBackTeam = {
            environment: env.friendlyId,
            name: "Unknown Team",
            teamNumber: teamNumber,
            documents: documents,
            matches: [],
            record: {
                wins: 0,
                losses: 0,
                ties: 0
            }
        }
        matches = matches.sort((a, b) => a.matchNumber - b.matchNumber);

        if(defaultAnalysis != undefined){
            var getPreparedAnalysis = prepareAnalysis(defaultAnalysis, schema, documents, matches, parseInt(teamNumber));
            sendBackTeam.analysis = getPreparedAnalysis;
        }

        matches.forEach(match => {
            if(match.teams.find(t => t.team == teamNumber) != undefined){
                var color = match.teams.find(t => t.team == teamNumber).color;
                if(match.results != null && match.results.finished){
                    // add to record
                    if(match.results[color.toLowerCase()] > match.results[color.toLowerCase() == "red" ? "blue" : "red"]){
                        // winner
                        sendBackTeam.record.wins++;
                    }else if(match.results[color.toLowerCase()] < match.results[color.toLowerCase() == "red" ? "blue" : "red"]){
                        // loser
                        sendBackTeam.record.losses++;
                    }
                    else{
                        // tie
                        sendBackTeam.record.ties++;
                    }

                    sendBackTeam.matches.push({
                        matchNumber: match.matchNumber,
                        color: color,
                        score: {
                            red: match.results.red,
                            blue: match.results.blue
                        },
                        finished: true
                    });
                }else{
                    sendBackTeam.matches.push({
                        matchNumber: match.matchNumber,
                        color: color,
                        finished: false
                    });
                }

                
            }
        });

        res.json({team: sendBackTeam, auth: authValid});
    }else{
        var team = teams[0];
        var matches = await db.getDocs("Match", {environment: env.friendlyId, competition: competition});
        var sendBackTeam = {
            environment: team.environment,
            name: team.name,
            teamNumber: team.teamNumber,
            documents: documents,
            matches: [],
            record: {
                wins: 0,
                losses: 0,
                ties: 0
            }

        };

        if(defaultAnalysis != undefined){
            var getPreparedAnalysis = prepareAnalysis(defaultAnalysis, schema, documents, matches, parseInt(teamNumber));
            sendBackTeam.analysis = getPreparedAnalysis;
        }

        matches.forEach(match => {
            if(match.teams.find(t => t.team == teamNumber) != undefined){
                var color = match.teams.find(t => t.team == teamNumber).color;
                if(match.results != null && match.results.finished){
                    // add to record
                    if(match.results[color.toLowerCase()] > match.results[color.toLowerCase() == "red" ? "blue" : "red"]){
                        // winner
                        sendBackTeam.record.wins++;
                    }else if(match.results[color.toLowerCase()] < match.results[color.toLowerCase() == "red" ? "blue" : "red"]){
                        // loser
                        sendBackTeam.record.losses++;
                    }
                    else{
                        // tie
                        sendBackTeam.record.ties++;
                    }

                    sendBackTeam.matches.push({
                        matchNumber: match.matchNumber,
                        color: color,
                        score: {
                            red: match.results.red,
                            blue: match.results.blue
                        },
                        finished: true
                    });
                }else{
                    sendBackTeam.matches.push({
                        matchNumber: match.matchNumber,
                        color: color,
                        finished: false
                    });
                }

                
            }
        });

        res.json({team: sendBackTeam, auth: authValid});


    }
})

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

    var matchNumber = req.body.matchNumber;
    var teams = req.body.teams;
    var locked = req.body.locked;
    var date = req.body.date;

    var match = {
        environment: env.friendlyId,
        competition: env.settings.competitionYear + env.settings.competitionCode,
        matchNumber: matchNumber,
        teams: teams,
        locked: locked,
        results: {
            finished: false,
            red: -1,
            blue: -1
        },
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
        datetime: new Date(),
        competition: env.settings.competitionYear + env.settings.competitionCode,
        name: req.body.name,
        flagged: false
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
    var name = req.body.name;
    if(name == undefined){
        name = document.name;
    }
    var flagged = req.body.flagged;
    if(flagged == undefined){
        flagged = document.flagged;
    }

    await db.updateDoc("Document", {_id: docId}, {image: image, json: json, datetime: new Date(), name: name, flagged: flagged});
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
    var settings = req.body.settings;

    var docs = await db.getDocs("Schema", {Name: name});
    if(docs.length > 0){
        await db.updateDoc("Schema", {Name: name}, {Parts: data, Updated: new Date(), Settings: settings});
        res.status(200).json({message: "Schema updated!"});
        return;
    }
    db.createDoc("Schema", {Name: name, Parts: data, Updated: new Date(), Settings: settings});
    res.status(200).json({message: "Schema created!"});
});

router.delete("/schema", async (req, res, next) => {
    var env = await authTools.getEnvironment(environment);

    var name = req.body.name;
    var docs = await db.getDocs("Schema", {Name: name});
    if(docs.length > 0){
        await db.deleteDoc("Schema", {Name: name});
        res.status(200).json({message: "Schema deleted!"});
        return;
    }
    res.status(404).json({message: "Schema not found!"});
})

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

            var allDocs = await db.getDocs("Document", {environment: env.friendlyId, competition: env.settings.competitionYear + env.settings.competitionCode});
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
                datetime: new Date(),
                competition: env.settings.competitionYear + env.settings.competitionCode,
                name: ""
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
                    var associatedMatch = possibleMatches.find((m) => m.matchNumber == match && m.competition == env.settings.competitionYear + env.settings.competitionCode);
                    
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

router.get("/analysis/all", async (req, res, next) => {
    var env = await authTools.getEnvironment(environment);

    var docs = await db.getDocs("AnalysisSet", {environment: env.friendlyId});
    res.json({analysis: docs});
});

router.post("/analysis/documents", async (req, res, next) => {
    var env = await authTools.getEnvironment(environment);

    var analysisId = req.body.analysisId;
    //console.log("POINT A");
    var analysis = (await db.getDocs("AnalysisSet", {_id: analysisId, environment: env.friendlyId}))[0];
   // console.log("POINT B");
    var schema = (await db.getDocs("Schema", {Name: analysis.Schema.Name}))[0];
    //console.log("POINT C");


    var allDocs = (await db.getDocs("Document", {environment: env.friendlyId, competition: env.settings.competitionYear + env.settings.competitionCode}));
    //console.log("POINT D");
    var allMatches = await db.getDocs("Match", {environment: env.friendlyId, competition: env.settings.competitionYear + env.settings.competitionCode});
    //console.log("POINT E");

    res.send({analysis: analysis, schema: schema, allDocs: allDocs, allMatches: allMatches});

    

    


});

router.post("/analysis", async (req, res, next) => {
    var env = await authTools.getEnvironment(environment);

    var name = req.body.Name;
    var parts = req.body.Parts;
    var schema = req.body.Schema;
    var updated = new Date();

    var prevDoc = (await db.getDocs("AnalysisSet", {Name: name, environment: env.friendlyId}))[0];
    if(prevDoc != undefined){
        await db.updateDoc("AnalysisSet", {_id: prevDoc._id}, {Parts: parts, Schema: schema, Updated: updated});
        res.status(200).json({message: "Analysis updated!"});
        return;
    }

    var doc = await db.createDoc("AnalysisSet", {Name: name, Parts: parts, Schema: schema, Updated: updated, environment: env.friendlyId});
    res.status(200).json({message: "Analysis created!"});
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

            var allDocs = await db.getDocs("Document", {environment: env.friendlyId, competition: env.settings.competitionYear + env.settings.competitionCode});
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
                datetime: new Date(),
                competition: env.settings.competitionYear + env.settings.competitionCode,
                name: ""
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


        if(env.settings.matchType == "Playoff"){
            dataPiece.Number += 900;
        }

        var generatedData = {
            team: dataPiece.Team,
            completed: true,
            data: dataPiece.Data,
            author: dataPiece.Scouter,
            schema: dataPiece.Schema,
            deviceId: dataPiece.DeviceID,
            identifier: dataPiece.Identifier,
            match: dataPiece.Number,
            color: dataPiece.Color,
            type: "tablet",
            disabled: dataPiece.Disabled
        }

        var allDocs = await db.getDocs("Document", {environment: env.friendlyId, competition: env.settings.competitionYear + env.settings.competitionCode});
        var prevDoc = allDocs.find((doc) => JSON.parse(doc.json).identifier == dataPiece.Identifier);
        if(prevDoc != undefined){
            await db.updateDoc("Document", {_id: prevDoc._id}, {json: JSON.stringify(generatedData), datetime: new Date(dataPiece.Created)});
            continue;
        }


        var document = {
            environment: env.friendlyId,
            dataType: "match",
            json: JSON.stringify(generatedData),
            datetime: new Date(dataPiece.Created),
            competition: env.settings.competitionYear + env.settings.competitionCode,
            name: ""
        }

        var associatedMatch = await db.getDocs("Match", {environment: env.friendlyId, matchNumber: dataPiece.Number, competition: env.settings.competitionYear + env.settings.competitionCode});

        


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

    if(year == undefined || year == ""){
        year = env.settings.competitionYear;
    }
    if(competition == undefined || competition == ""){
        competition = env.settings.competitionCode;
    }

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


    if(matchType != "Qualification" && matchType != "Playoff" && matchType != "Practice" && matchType != "None"){
        matchType = env.settings.matchType;
    }
    if(competition == undefined || competition == ""){
        competition = env.settings.competitionCode;
    }
    if(year == undefined || year == ""){
        year = env.settings.competitionYear;
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

            
            if(match["tournamentLevel"] == "Playoff"){
                match["matchNumber"] += 900;
            }
            var matchNumber = match["matchNumber"];

            var existingMatch = await db.getDocs("Match", {environment: env.friendlyId, matchNumber: match["matchNumber"], competition: year +competition});
            
            var teams = [];
            match["teams"].forEach((team) => {
                teams.push({
                    team: team["teamNumber"],
                    color: team["station"].substring(0, team["station"].length - 1)
                });
            });
            var date = new Date(match["startTime"]);

            if(existingMatch.length > 0){

                await db.updateDoc("Match", {_id: existingMatch[0]._id}, {teams: teams, planned: date});

                return;
            }

            
            

            

            var match = {
                environment: env.friendlyId,
                competition: year + competition,
                matchNumber: matchNumber,
                description: match["description"],
                matchType: match["tournamentLevel"],
                teams: teams,
                locked: false,
                results: {
                    finished: false,
                    red: -1,
                    blue: -1
                },
                documents: [],
                planned: date
            }

            await db.createDoc("Match", match);

        });


    }

    
});

async function updateCache(year, competition, matchType){

    if(matchType != "Qualification" && matchType != "Playoff" && matchType != "Practice" && matchType != "None"){
        matchType = "Qualification";
    }
    var env = await authTools.getEnvironment(environment);
    var fRes1 = await firstApiTools.getRankings(year, competition);

    var finalRankings = [];
    var rankings = fRes1["Rankings"];
    rankings.forEach((ranking) => {
        finalRankings.push({
            team: ranking["teamNumber"],
            rank: ranking["rank"],
            record: {
                wins: ranking["wins"],
                losses: ranking["losses"],
                ties: ranking["ties"]
            },
            rankingPoints: ranking["sortOrder1"],
            matchesPlayed: ranking["matchesPlayed"]
        });
    });

    var fRes2 = await firstApiTools.getSimpleMatchResults(year, competition, matchType);
    

    var latestMatch = 0;
    var matchResults = fRes2["Matches"];
    matchResults.forEach((match) => {
        if(match["tournamentLevel"] == "Playoff"){
            match["matchNumber"] += 900;
        }
        if(match["actualStartTime"] != null && match["actualStartTime"] != undefined){
            if(match["matchNumber"] > latestMatch){
                latestMatch = match["matchNumber"];
            }
        }
        
    })
    var currentMatch = 0;
    if(latestMatch != 0){
        currentMatch = latestMatch + 1;
    }else{
        currentMatch = -1;
    }

    var fResComp = await firstApiTools.getCompetitionInfo(year, competition);
    var comp = fResComp["Events"][0];
    var competitionName = "Unknown";
    var location = "Unknown";
    if(comp != undefined){
        competitionName = comp["name"];
        location = comp["city"] + ", " + comp["stateprov"];
    }


    var cache = {
        rankings: finalRankings,
        currentMatch: currentMatch,
        updated: new Date(),
        competitionName: competitionName,
        location: location
    }

    await db.updateDoc("Environment", {_id: env._id}, {cachedCompetitionData: cache});

    return cache;
}

router.get("/first/cache", async (req, res, next) => {
    // if data is older than 5 minutes, update it
    var env = await authTools.getEnvironment(environment);

    var cache = env.cachedCompetitionData;
    if(cache.updated == undefined || cache.updated.getTime() + 1000 * 60 * 5 < new Date().getTime()){
        var year = env.settings.competitionYear;
        var competition = env.settings.competitionCode;
        var matchType = env.settings.matchType;

        if(year == undefined || competition == undefined){
            res.status(500).json({message: "No competition set!"});
            return;
        }

        cache = await updateCache(year, competition, matchType);
    }

    res.status(200).json({message: "Cache possibly updated as a result of your request!", cache: cache});
});


router.get("/first/updateCache", async (req, res, next) => {
    var env = await authTools.getEnvironment(environment);

    var year = env.settings.competitionYear;
    var competition = env.settings.competitionCode;
    var matchType = env.settings.matchType;

    if(year == undefined || competition == undefined){
        res.status(500).json({message: "No competition set!"});
        return;
    }

    var cache = await updateCache(year, competition, matchType);
    

    res.status(200).json({message: "Cache updated!", cache: cache});



    
});

router.get("/quick/state", async (req, res, next) => {
    var env = await authTools.getEnvironment(environment);

    var currentMatch = env.cachedCompetitionData.currentMatch;
    var competitionName = env.cachedCompetitionData.competitionName;
    var location = env.cachedCompetitionData.location;
    
    var currentlyRunning = true;
    var allMatches = await db.getDocs("Match", {environment: env.friendlyId, competition: env.settings.competitionYear + env.settings.competitionCode});
    var ourNextMatches = allMatches.filter((match) => match.teams.find((team) => team.team == env.settings.teamNumber) != undefined && match.results.finished == false);
    ourNextMatches = ourNextMatches.sort((a, b) => a.matchNumber - b.matchNumber);
    var ourNextMatch = -1;
    if(ourNextMatches.length > 0){
        ourNextMatch = ourNextMatches[0];
        ourNextMatch.documents = [];
        var color = "";
        ourNextMatch.teams.forEach(t => {
            if(t.team.toString() == env.settings.teamNumber.toString()){
                color = t.color;
            }
        })
        ourNextMatch.color = color;
    }
    var currentMatchType = env.settings.matchType;
    console.log(env.settings);
    var largerMatches = allMatches.filter((match) => {return match.matchNumber >= currentMatch});
    currentlyRunning = largerMatches.length > 0;

    res.status(200).json({currentMatch: currentMatch, ourNextMatch: ourNextMatch, currentlyRunning: currentlyRunning, matchType: currentMatchType, competitionName: competitionName, location: location, matches: allMatches, teamNumber: env.settings.teamNumber});
    
});

router.get("/quick/team*", async (req, res, next) => {
    var env = await authTools.getEnvironment(environment);

    var teamNumber = req.query.teamNumber;

    var rankingObject = env.cachedCompetitionData.rankings.find((ranking) => ranking.team == parseInt(teamNumber));
    var teamObject = await db.getDocs("Team", {environment: env.friendlyId, teamNumber: teamNumber});


    res.status(200).json({ranking: rankingObject, team: teamObject});

});

router.get("/quick/matches*", async (req, res, next) => {
    var env = await authTools.getEnvironment(environment);

    var teamNumber = req.query.teamNumber;
    var matchType = env.settings.matchType;
    if(teamNumber == undefined){

        
        

        var allMatches = await db.getDocs("Match", {environment: env.friendlyId, competition: env.settings.competitionYear + env.settings.competitionCode});
        
        var sendBackMatches = allMatches.filter(function(m){
            if(m.matchNumber > 900 && matchType == "Playoff"){
                return true;
            }else if(m.matchNumber < 900 && matchType == "Qualification" ){
                return true;
            }
            return false;
        });
        if(matchType == "Playoff"){
            sendBackMatches.forEach((m) => {
                m.matchNumber -= 900;
            });
        }
        // remove all specific scoring data
        for(var i = 0; i < sendBackMatches.length; i++){
            sendBackMatches[i].documents = [];
            sendBackMatches[i].results = {
                finished: sendBackMatches[i].results.finished,
                red: sendBackMatches[i].results.red,
                blue: sendBackMatches[i].results.blue
            }
        }
        res.status(200).json({matches: sendBackMatches});
        return;
    }

    var allMatches = await db.getDocs("Match", {environment: env.friendlyId, competition: env.settings.competitionYear + env.settings.competitionCode});
    var sendBackMatches = allMatches.filter((m) => m.teams.find((t) => t.team.toString() == teamNumber) != undefined);
    sendBackMatches = sendBackMatches.filter(function(m){
        if(m.matchNumber > 900 && matchType == "Playoff"){
            return true;
        }else if(m.matchNumber < 900 && matchType == "Qualification" ){
            return true;
        }
        return false;
    });
    if(matchType == "Playoff"){
        sendBackMatches.forEach((m) => {
            m.matchNumber -= 900;
        });
    }
    // remove all specific scoring data
    for(var i = 0; i < sendBackMatches.length; i++){
        sendBackMatches[i].documents = [];
        sendBackMatches[i].results = {
            finished: sendBackMatches[i].results.finished,
            red: sendBackMatches[i].results.red,
            blue: sendBackMatches[i].results.blue
        }
    }

    res.status(200).json({matches: sendBackMatches});
});

router.get("/first/results*", async(req, res, next) => {
    var env = await authTools.getEnvironment(environment);

    var year = req.query.year;
    var competition = req.query.competition;
    var matchType = req.query.matchType;
    if(matchType != "Qualification" && matchType != "Playoff" && matchType != "Practice" && matchType != "None"){
        matchType = "Qualification";
    }
    if(year == undefined || year == ""){
        year = env.settings.competitionYear;
    }
    if(competition == undefined || competition == ""){
        competition = env.settings.competitionCode;
    }

    var doNotPush = req.query.doNotPush == "true";


    var fRes = await firstApiTools.getMatchResults(year, competition, matchType);

    var path = process.env.HOME_FOLDER + "/cache/" + "results.json";
    

    

    if(fRes.error == undefined && !doNotPush){
        
        try{

            var sendBackFRes = JSON.stringify(fRes);
            var matches = fRes["MatchScores"];
            for(var i = 0; i < matches.length; i++){
                var match = matches[i];

                if(match["matchLevel"] == "Playoff"){
                    match["matchNumber"] += 900;
                }

                var existingMatch = await db.getDocs("Match", {environment: env.friendlyId, matchNumber: match["matchNumber"], competition: year+competition});
                if(existingMatch.length == 0){
                    return;
                }

                existingMatch = existingMatch[0];


                existingMatch.results["finished"] = true;

                

                var redAlliance = match["alliances"].find(a => a.alliance == "Red");
                if(redAlliance == undefined){
                    throw "Red alliance not found!";
                }
                existingMatch.results["red"] = redAlliance["totalPoints"];
                existingMatch.results["redStats"] = {};
                // get each red scoring metric
                Object.keys(redAlliance).forEach((key) => {
                    if(key == "alliance")
                        return;

                    // turn camel case into normal words string
                    var words = key.replace(/([A-Z])/g, ' $1').trim();
                    

                    existingMatch.results["redStats"][words] = redAlliance[key];
                    
                });

                var blueAlliance = match["alliances"].find(a => a.alliance == "Blue");
                if(blueAlliance == undefined){
                    throw "Blue alliance not found!";
                }
                existingMatch.results["blue"] = blueAlliance["totalPoints"];
                existingMatch.results["blueStats"] = {};
                // get each blue scoring metric
                Object.keys(blueAlliance).forEach((key) => {
                    if(key == "alliance")
                        return;

                    // turn camel case into normal words string
                    var words = key.replace(/([A-Z])/g, ' $1').trim();
                    

                    existingMatch.results["blueStats"][words] = blueAlliance[key];
                    
                });
                
                await db.updateDoc("Match", {_id: existingMatch._id}, {results: existingMatch.results});
            }
            res.status(fRes.error == undefined ? 200 : 500).json({data: sendBackFRes});
            fs.writeFile(path, sendBackFRes, (err) => {

            });
        }catch(e){
            fRes = await firstApiTools.getSimpleMatchResults(year, competition, matchType);
            var sendBackFRes = JSON.stringify(fRes);
            var matches = fRes["Matches"];
            if(matches == undefined){
                res.status(500).json({error: "No matches found"});
                return;
            }
            res.status(fRes.error == undefined ? 200 : 500).json({data: sendBackFRes});
            fs.writeFile(path, sendBackFRes, (err) => {

            });
            for(var i = 0; i < matches.length; i++){
                var match = matches[i];
                if(match["matchLevel"] == "Playoff"){
                    match["matchNumber"] += 900;
                }
                var existingMatch = await db.getDocs("Match", {environment: env.friendlyId, matchNumber: match["matchNumber"], competition: year+competition});
                if(existingMatch.length == 0){
                    return;
                }
                existingMatch = existingMatch[0];
                existingMatch.results["finished"] = true;

                existingMatch.results["red"] = match["scoreRedFinal"];
                existingMatch.results["blue"] = match["scoreBlueFinal"];
                existingMatch.results["redStats"] = {};
                existingMatch.results["blueStats"] = {};

                await db.updateDoc("Match", {_id: existingMatch._id}, {results: existingMatch.results});
            }
        }
        
    }else{
        res.status(fRes.error == undefined ? 200 : 500).json({data: sendBackFRes});
    }

});


module.exports = router;