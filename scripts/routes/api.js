var express = require('express');
var router = express.Router();
var db = require('../database.js');
var authTools = require('../tools/authHelper.js');
var firstApiTools = require('../tools/firstApi.js');
var bodyParser = require('body-parser');
let environment = "test";
var fs = require('fs');
var { sendNotificationAll } = require('../tools/notifications.js');


/**
 * @api {get} /api/ Get base API information
 * @apiName GET API
 * @apiGroup API
 */


router.get('/', function(req, res, next) {
    res.json({message: "Welcome to the StormCloud API!", account: false, version: "0.0.1"});
});

router.get('/export/matches', async function(req, res, next) {
    let env = await authTools.getEnvironment(environment);

    var matches = await db.getDocs("Match", {environment: env.friendlyId, competition: env.settings.competitionYear + env.settings.competitionCode});
   

    var sendBackString = "";
    matches.forEach(match => {
        sendBackString += JSON.stringify(match) + "\n";
    });

    res.send(sendBackString);
});

router.get('/export/teams', async function(req, res, next) {
    let env = await authTools.getEnvironment(environment);

    var teams = await db.getDocs("Team", {environment: env.friendlyId});
    var matches = await db.getDocs("Match", {environment: env.friendlyId, competition: env.settings.competitionYear + env.settings.competitionCode});

    var teamsToSend = [];

    matches.forEach(match => {
        match.teams.forEach(team => {
            if(teamsToSend.filter(t => t.teamNumber == team.team).length == 0){
                // generate random id if it doesn't exist
                teamsToSend.push({teamNumber: team.team, name: teams.find(t => t.teamNumber == team) == undefined ? "Unknown" : teams.find(t => t.teamNumber == team).name, _id: teams.find(t => t.teamNumber == team) == undefined? Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) : teams.find(t => t.teamNumber == team)._id});
            }
        })
    });

    teamsToSend = teamsToSend.sort((a, b) => (a.teamNumber - b.teamNumber));
   

    var sendBackString = "";
    teamsToSend.forEach(team => {
        sendBackString += JSON.stringify(team) + "\n";
    });

    res.send(sendBackString);
});

router.get('/export/rankings', async function(req, res, next) {
   let env = await authTools.getEnvironment(environment);
   
   var rankings = env.cachedCompetitionData.rankings;

    var sendBackString = "";
    rankings.forEach(rank => {
        sendBackString += JSON.stringify(rank) + "\n";
    });

    res.send(sendBackString);
});

router.get('/export/documents', async function(req, res, next) {
    let env = await authTools.getEnvironment(environment);

    var documents = await db.getDocs("Document", {environment: env.friendlyId, dataType: "match", competition: env.settings.competitionYear + env.settings.competitionCode});
   

    var sendBackString = "";
    documents.forEach(doc => {
        sendBackString += JSON.stringify(doc) + "\n";
    });

    res.send(sendBackString);
});

router.get('/export/analysis', async function(req, res, next) {
    let env = await authTools.getEnvironment(environment);

    var analysisSets = await db.getDocs("AnalysisSet", {environment: env.friendlyId, competition: env.settings.competitionYear + env.settings.competitionCode});

    var sendBackString = "";
    analysisSets.forEach(set => {
        sendBackString += JSON.stringify(set) + "\n";
    });

    res.send(sendBackString);
});

router.get('/export/schemas', async function(req, res, next) {

    var schemas = await db.getDocs("Schema", {});

    var sendBackString = "";
    schemas.forEach(schema => {
        sendBackString += JSON.stringify(schema) + "\n";
    });

    res.send(sendBackString);

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
            results: match.results,
            documents: [],
            _id: match._id
        }


        documents.forEach(doc => {
            var docData = JSON.parse(doc.json);
            if(match.matchNumber == docData.match && match.competition == doc.competition){
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


function prepareAnalysis(analysis, schema, documents, matches, teams, competition){
    // replication of the HTML version
    
    var partSets = {};
    var requestedDataPoints = {};
    var schemaFields = [];

    function addData(partId, team, key, value){
        if(Object.keys(partSets[partId][team]).find(k => k == key)){
            // then add to obj
            partSets[partId][team][key].push(value)
        }else{
            // then create obj
            partSets[partId][team][key] = [value];
        }
    }

    schema.Parts.forEach((part) => {
        part.Components.forEach((component) => {
            if(component.Type == "Label"){
                return;
            }
            if(component.Type == "Select" || component.Type == "Multi-Select"){
                schemaFields.push({
                    part: part.Name,
                    component: component.Name,
                    componentType: component.Type,
                    options: component.Options
                });
                return;
            }
            if(component.Type == "Check"){
                schemaFields.push({
                    part: part.Name,
                    component: component.Name,
                    componentType: component.Type,
                    on: component.On,
                    off: component.Off,
                    points: component.Points
                })
                return;
            }
            schemaFields.push({
                part: part.Name,
                component: component.Name,
                componentType: component.Type,
                points: component.Points
            })
        });
    });


    var finalData = undefined;
    // TODO: Graph, FIRST, Document data
    analysis.Parts.forEach((part) => {
        partSets[part._id] = {};
        teams.forEach((team) => {
            // separate by team
            partSets[part._id][team] = {};
        });
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
            case "Frequency":
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
            case "FIRST":
                // just request finalscore
                if(requestedDataPoints["DataPoint"] == undefined){
                    requestedDataPoints[part.Data["DataPoint"]] = [part._id];
                }else{
                    requestedDataPoints[part.Data["DataPoint"]].push(part._id);
                }
            case "Custom":
                part.Data["DataPieces"].forEach((piece) => {
                    if(requestedDataPoints[piece.DataPoint] == undefined){
                        requestedDataPoints[piece.DataPoint] = [part._id];
                    }else{
                        requestedDataPoints[piece.DataPoint].push(part._id);
                    }
                });
            case "Graph":
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
        }
    });

    documents.forEach((doc) => {
        var data = JSON.parse(doc.json);
        var foundTeam = teams.find(t => t == parseInt(data.team));
        if(!teams.includes(parseInt(data.team))){
            // not a doc we are looking for
            return;
        }

        if(doc.flagged){
            return;
        }

        if(!data.completed){
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

                if(!(doc.competition == competition) && analysisPart.Data.UseOtherDocs != true){
                    return;
                }

                var usePoints = analysisPart.Data.UsePoints == "true";
                if(analysisPart.Type == "Custom"){
                    var points = 0;

                    var applicableDataPiece = analysisPart.Data.DataPieces.find(p => p.DataPoint == key);


                    if(applicableDataPiece.Type.includes("Points")){
                        points = Function(`
                            var x = ${useData};
                            return ${field.points};
                        `)();
                    }
                    addData(partId, foundTeam, key, {
                        match: data.match,
                        data: applicableDataPiece.Type.includes("Points") ? points : useData
                    });
                    return;
                }
                else if(analysisPart.Type == "Frequency"){
                    if(field.componentType == "Input"){
                        
                        addData(partId, foundTeam, key, useData)
                    }
                }
                else if(analysisPart.Type == "Graph"){
                    if(analysisPart.Data.DocumentData != "true" && analysisPart.Data.DocumentData != true){
                        return;
                    }

                    if(field.componentType == "Step" || field.componentType == "Timer"){
                        var points = 0;
                        if(usePoints){
                            points = Function(`
                                var x = ${useData};
                                return ${field.points};
                            `)();

                        }
                        addData(partId, foundTeam, key, {
                            match: data.match,
                            data: usePoints ? points : useData
                        });
                    }
                    else if(field.componentType == "Check"){

                        var points = 0;
                        if(usePoints){
                            points = field.points;
                        }

                        addData(partId, foundTeam, key, {match: data.match, data: field.on == useData ? (usePoints ? points : 1) : 0})
                    }
                    else if(field.componentType == "Select"){
                        var optionSelected = field.options.find(o => o.Name == useData);
                        if(optionSelected != undefined){
                            addData(partId, foundTeam, key, {match:data.match, data: usePoints ? parseInt(optionSelected.Points) : optionSelected.Name})
                        }else{
                            addData(partId, foundTeam, key, {match:data.match, data: usePoints ? 0 : useData})
                        }

                    
                        
                    }
                    else if(field.componentType == "Multi-Select"){
                        var optionsSelected = useData.split(";");
                        //var toSendData = [];
                        optionsSelected.forEach((option) => {
                            var optionSelected = field.options.find(o => o.Name == option);
                            if(optionSelected != undefined){
                                addData(partId, foundTeam, key, {match:data.match, data: usePoints ? parseInt(optionSelected.Points) : optionSelected.Name})
                            }else{
                                addData(partId, foundTeam, key, {match:data.match, data: usePoints ? 0 : option})
                            }
                            
                        });
                        

                        
                    }
                    return;
                }
                if(field.componentType == "Step" || field.componentType == "Timer"){
                    var points = 0;
                    if(usePoints){
                        points = Function(`
                            var x = ${useData};
                            return ${field.points};
                        `)();

                    }
                    addData(partId, foundTeam, key, usePoints ? points : parseInt(useData))
                }else if(field.componentType == "Check"){
                    var points = 0;
                    if(usePoints){
                        points = field.points;
                    }
                    addData(partId, foundTeam, key, field.on == useData ? (usePoints ? parseInt(points) : 1) : 0);
                }else if(field.componentType == "Select"){
                    var optionSelected = field.options.find(o => o.Name == useData);
                    if(optionSelected == undefined){
                        optionSelected = {
                            Name: useData,
                            Points: 0
                        }
                    }

                    addData(partId, foundTeam, key, usePoints ? parseInt(optionSelected.Points) : optionSelected.Name)
                }else if(field.componentType == "Multi-Select"){
                    var optionsSelected = useData.split(";");
                    //var toSendData = [];
                    optionsSelected.forEach((option) => {
                        var optionSelected = field.options.find(o => o.Name == option);
                        if(optionSelected == undefined){
                            optionSelected = {
                                Name: option,
                                Points: 0
                            }
                        }
                        addData(partId, foundTeam, key, usePoints ? parseInt(optionSelected.Points) : optionSelected.Name)
                        //toSendData.append(usePoints ? optionSelected.Points : optionSelected.Name);
                    });
                    

                    
                }
                else if(field.componentType == "Grid"){
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



                            if(data.Color == undefined){
                                // TRY to get the match
                                var applicableMatch = allMatches.find(m => m.matchNumber == data.match)
                                if(applicableMatch == undefined){
                                    data.Color = "Red";
                                }
                                else{
                                    var applicableTeam = applicableMatch.teams.find(t => t.team == foundTeam);
                                    if(applicableTeam == undefined){
                                        data.Color = "Red";
                                    }
                                    else{
                                        data.Color = applicableTeam.color;
                                    }
                                }
                            }

                            putData = {
                                color: data.Color,
                                data: gridData
                            };
                            break;

                    }
                    addData(partId, foundTeam, key, putData);
                }
                // handle EACH PART ID AND ADDING DATA
                
            });

            
        });

    });

    matches.forEach((match) => {
        var foundTeams = match.teams.filter(t => teams.includes(t.team));
        if(foundTeams.length == 0 || foundTeams == undefined){
            return;
        }

        foundTeams.forEach((foundTeam) => {
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
                        var analysisPart = analysis.Parts.find(p => p._id == partId);
                        if(analysisPart.Type == "Graph"){
                            addData(partId, foundTeam.team, key, {
                                match: match.matchNumber,
                                data: stats[key]
                            })
                            return;
                        }else if(analysisPart.Type == "Custom"){
                            addData(partId, foundTeam.team, key, {
                                match: match.matchNumber,
                                data: stats[key]
                            });
                            return;
                        }
                        // handle EACH PART ID AND ADDING DATA
                        addData(partId, foundTeam.team, key, stats[key]);
                    });
                });

                var score = match.results.red;
                var rp = match.results.redStats.rp;
                var penalties = match.results.redStats["tech Foul Count"] + match.results.redStats["foul Count"];
                if(requestedDataPoints["score"] != undefined){
                    requestedDataPoints["score"].forEach((partId) => {
                        addData(partId, foundTeam.team, "score", score);
                    });
                }
                if(requestedDataPoints["rp"] != undefined){
                    requestedDataPoints["rp"].forEach((partId) => {
                        addData(partId, foundTeam.team, "rp", rp);
                    });
                }
                if(requestedDataPoints["penalties"] != undefined){
                    requestedDataPoints["penalties"].forEach((partId) => {
                        addData(partId, foundTeam.team, "penalties", penalties);
                    });
                }

            }else{
                var stats = match.results.blueStats;
                Object.keys(stats).forEach((key) => {
                    if(requestedDataPoints[key] == undefined){
                        return;
                    }
                    requestedDataPoints[key].forEach((partId) => {
                        var analysisPart = analysis.Parts.find(p => p._id == partId);
                        if(analysisPart.Type == "Graph"){
                            addData(partId, foundTeam.team, key, {
                                match: match.matchNumber,
                                data: stats[key]
                            });
                            return;
                        }else if(analysisPart.Type == "Custom"){
                            addData(partId, foundTeam.team, key, {
                                match: match.matchNumber,
                                data: stats[key]
                            });
                            return;
                        }
                        addData(partId, foundTeam.team, key, stats[key]);
                    });
                });

                var score = match.results.blue;
                var rp = match.results.blueStats.rp;
                var penalties = match.results.blueStats["tech Foul Count"] + match.results.blueStats["foul Count"];
                if(requestedDataPoints["score"] != undefined){
                    requestedDataPoints["score"].forEach((partId) => {
                        addData(partId, foundTeam.team, "score", score);
                    });
                }
                if(requestedDataPoints["rp"] != undefined){
                    requestedDataPoints["rp"].forEach((partId) => {
                        addData(partId, foundTeam.team, "rp", rp);
                    });
                }
                if(requestedDataPoints["penalties"] != undefined){
                    requestedDataPoints["penalties"].forEach((partId) => {
                        addData(partId, foundTeam.team, "penalties", penalties);
                    });
                }
            }
        });

        


    });

    console.log(partSets);

    finalData = {};
    teams.forEach((team) => {
        finalData[team] = [];
    });
    Object.keys(partSets).forEach((partId) => {
        // now we condense

        

        var part = analysis.Parts.find(p => p._id == partId);

        teams.forEach((team) => {
            var partData = partSets[partId][team];

            switch(part.Type){
                case "Custom":
                    var final = 0;

                    var finalMethod = part.Data["Stat_Final"];

                    var options = part.Data["DataPieces"];

                    var variableLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
                    var matchData = {};

                    var codeString = ``;
                    part.Data["Code"].forEach((line) => {
                        codeString += line + `\n`;
                    });


                    Object.keys(partData).forEach((key) => {
                        var applicableOption = options.find(o => o.DataPoint == key);

                        if(applicableOption == undefined) return;

                        partData[key].forEach((data) => {
                            if(matchData[data.match] == undefined){
                                matchData[data.match] = [];
                            }
                            matchData[data.match].push({
                                variable: applicableOption.Variable,
                                value: data.data
                            })
                        });


                    });

                    var localFinals = [];
                    Object.keys(matchData).forEach((key) => {
                        var localFinal = 0;

                        var variables = matchData[key];
                        var functionString = ``;
                        for(var i = 0; i < options.length; i++){
                            var letter = variableLetters[i];
                            var applicableValue = variables.find(v => v.variable == letter) == undefined ? 0 : variables.find(v => v.variable == letter).value;
                            if(Number.isInteger(applicableValue)){
                                functionString += `var ${letter} = ${applicableValue};\n`;
                            }else{
                                functionString += `var ${letter} = "${applicableValue}";\n`;
                            }
                            

                        }
                        


                        localFinal = Function(`
                            ${functionString}
                                
                            ${codeString}
                            `)();
                        localFinals.push(localFinal);
                    });

                    console.log(localFinals);

                    var final = 0;

                    switch(finalMethod){
                        case "sum":
                            final = localFinals.reduce((a, b) => a + b, 0);
                            break;
                        case "avg":
                            final = localFinals.reduce((a, b) => a + b, 0) / localFinals.length;
                            break;
                        case "max":
                            final = Math.max(...localFinals);
                            break;
                        case "min":
                            final = Math.min(...localFinals);
                            break;
                        case "range":
                            final = Math.max(...localFinals) - Math.min(...localFinals);
                            break;
                    }

                    if(final != null){
                        finalData[team].push({
                            name: part.Name,
                            type: part.Type,
                            value: final
                        });
                    }
                    


                    break;

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
                    finalData[team].push({
                        name: part.Name,
                        type: part.Type,
                        value: final
                    });


                    break;
                case "Grid":
                    // get one grid for each team!
                    var finalRed = [];
                    var finalBlue = [];

                    Object.keys(partData).forEach((key) => {
                        try{
                            if(partData[key].length == 0){
                                return;
                            }
                            var localFinalForTeamRed = [];
                            var localFinalForTeamBlue = [];
                            
                            var height = partData[key][0]["data"].length;
                            var width = partData[key][0]["data"][0].length;

                            for(var i = 0; i < height; i++){
                                var row = [];
                                for(var j = 0; j < width; j++){
                                    row.push(0);
                                }
                                localFinalForTeamRed.push(row);
                                localFinalForTeamBlue.push(row.map(c => c));
                            }

                            partData[key].forEach((gridD) => {
                                var grid = gridD.data;
                                var color = gridD.color;
                                if(color == "Red"){
                                    grid.forEach((row, i) => {
                                        row.forEach((col, j) => {
                                            var toAdd = 0;
                                            if(parseInt(grid[i][j]) != -1){
                                                toAdd = 1;
                                            }
                                            localFinalForTeamRed[i][j] += toAdd;
                                        });
                                    });

                                }else{
                                    grid.forEach((row, i) => {
                                        row.forEach((col, j) => {
                                            var toAdd = 0;
                                            if(parseInt(grid[i][j]) != -1){
                                                toAdd = 1;
                                            }
                                            localFinalForTeamBlue[i][j] += toAdd;
                                        });
                                    });
                                }

                                
                            });

                            finalRed.push(localFinalForTeamRed);
                            finalBlue.push(localFinalForTeamBlue);
                        }catch(e){
                            // if it reaches here, then it is of a different size
                        }
                        
                    });

                    var maxRed = 0;
                    
                    for(var i = 1; i < finalRed.length; i++){
                        for(var r = 0; r < finalRed[i].length; r++){
                            for(var c = 0; c < finalRed[i][r].length; c++){
                                if(finalRed[i][r][c] != -1){
                                    finalRed[0][r][c] += finalRed[i][r][c];
                                }
                            }
                        }
                    }
                    try{
                        for(var r = 0; r < finalRed[0].length; r++){
                            for(var c = 0; c < finalRed[0][r].length; c++){
                                if(finalRed[0][r][c] > maxRed){
                                    maxRed = finalRed[0][r][c];
                                }
                            }
                        }
                    }catch(e){

                    }

                    var maxBlue = 0;
                    for(var i = 1; i < finalBlue.length; i++){
                        for(var r = 0; r < finalBlue[i].length; r++){
                            for(var c = 0; c < finalBlue[i][r].length; c++){
                                if(finalBlue[i][r][c] != -1){
                                    finalBlue[0][r][c] += finalBlue[i][r][c];
                                }
                            }
                        }
                    }
                    try{
                        for(var r = 0; r < finalBlue[0].length; r++){
                            for(var c = 0; c < finalBlue[0][r].length; c++){
                                if(finalBlue[0][r][c] > maxBlue){
                                    maxBlue = finalBlue[0][r][c];
                                }
                            }
                        }
                    }catch(e){

                    }
                    
                
                    finalData[team].push({
                        name: part.Name,
                        type: part.Type,
                        valueRed: finalRed[0],
                        valueBlue: finalBlue[0],
                        maxRed: maxRed,
                        maxBlue: maxBlue,
                        separate: part.Data.SeparateColors
                    });
                    break;
                case "FIRST":
                    var final = 0;
                    var n = 0;

                    var method = part.Data["Stat"];

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
                    finalData[team].push({
                        name: part.Name,
                        type: part.Type,
                        value: final
                    });
                    break;
                case "Frequency":

                    var uniqueValues = [];
                    
                    var allValues = [];
                    Object.keys(partData).forEach((key) => {
                        partData[key].forEach((item) => {
                            if(!uniqueValues.includes(item)){
                                uniqueValues.push(item);
                            }
                            allValues.push(item);
                        });
                    });

                    uniqueValues = uniqueValues.sort();

                    var totalItems = allValues.length;
                    var percents = [];
                    uniqueValues.forEach(u => {
                        var count = allValues.filter(v => v == u).length / totalItems;
                        count = Math.round(count*100);
                        percents.push(count);
                    });
                    

                    finalData[team].push({
                        name: part.Name,
                        type: part.Type,
                        fields: uniqueValues,
                        values: percents
                    });


                    break;
                case "Graph":
                    var matchesUnique = [];
                    var allDataObjects = [];
                    var method = part.Data["Stat_Between"];
                    Object.keys(partData).forEach((key) => {
                        partData[key].forEach((match) => {
                            if(!matchesUnique.includes(match.match)){
                                matchesUnique.push(match.match);
                            }
                            allDataObjects.push(match);
                        });
                    });

                    matchesUnique.sort((a, b) => {
                        return a - b;
                    });
                    var final = [];
                    matchesUnique.forEach((match) => {
                        var matchData = allDataObjects.filter((obj) => {
                            return obj.match == match;
                        });
                        var matchFinal = {
                            match: match,
                            data: 0
                        };
                        

                        switch(method){
                            case "sum":
                                matchFinal.data = matchData.reduce((a, b) => parseFloat(a) + parseFloat(b.data), 0);
                                break;
                            case "avg":
                                matchFinal.data = matchData.reduce((a, b) => parseFloat(a) + parseFloat(b.data), 0) / matchData.length;
                                break;
                            case "max":
                                matchFinal.data = Math.max(...matchData.map((obj) => parseFloat(obj.data)));
                                break;
                            case "min":
                                matchFinal.data = Math.min(...matchData.map((obj) => parseFloat(obj.data)));
                                break;
                            case "range":
                                matchFinal.data = Math.max(...matchData.map((obj) => parseFloat(obj.data))) - Math.min(...matchData.map((obj) => parseFloat(obj.data)));
                                break;
                        }

                        matchFinal.data = Math.round(matchFinal.data*10)/10;

                        final.push(matchFinal);
                    });


                    var matchesFinal = final.map((obj) => obj.match);
                    var dataFinal = final.map((obj) => obj.data);

                    var average = 0;
                    dataFinal.forEach(d => {
                        average += d;
                    })
                    average = average / dataFinal.length;

                    finalData[team].push({
                        name: part.Name,
                        type: part.Type,
                        matches: matchesFinal,
                        data: dataFinal,
                        average: average
                    });

                    break;
                


            }
        });


        
    });

    Object.keys(finalData).forEach(t => {
        finalData[t].forEach(p => {
            if(p.value == null){
                p.value = 0;
            }
        })
    })

    console.log(finalData);

    return finalData;





}


router.get("/request/analysis*", async(req, res, next) => {
    let env = await authTools.getEnvironment(environment);

    var authValid = await authTools.checkPassword(req.query.authKey, env);
    var teams = req.query.teams.split(",");
    for(var i = 0; i < teams.length; i++){
        teams[i] = parseInt(teams[i]);
    }
    var analysisRequested = req.query.analysis;

    var preparedAnalysis = undefined;
    var competition = env.settings.competitionYear + env.settings.competitionCode;
    if(authValid){
        var allAnalysises = await db.getDocs("AnalysisSet", {environment: env.friendlyId});
        var analysis = allAnalysises.find(a => a.Name == analysisRequested != undefined ? analysisRequested : env.settings.defaultAnalysis);
        if(analysis == undefined){
            analysis = allAnalysises.find(a => a.Name == env.settings.defaultAnalysis);
        }

        var schemas = await db.getDocs("Schema", {environment: env.friendlyId});
        schema = schemas.find(s => s.Name == analysis.Schema.Name);
        var matches = await db.getDocs("Match", {environment: env.friendlyId, competition: competition});
        matches = matches.sort((a, b) => a.matchNumber - b.matchNumber);
        var documents = await db.getDocs("Document", {environment: env.friendlyId, dataType: "match"});

        preparedAnalysis = prepareAnalysis(analysis, schema, documents, matches, teams, env.settings.competitionYear + env.settings.competitionCode);





    }

    res.send({analysis: preparedAnalysis, auth: authValid});
    

});

router.get("/request/team*", async(req, res, next) => {
    let env = await authTools.getEnvironment(environment);


    var authValid = await authTools.checkPassword(req.query.authKey, env);

    var teamNumber = req.query.teamNumber;
    var competition = env.settings.competitionYear + env.settings.competitionCode;

    var teams = await db.getDocs("Team", {environment: env.friendlyId, teamNumber: teamNumber});
    



    var documents = [];
    if(authValid){
        var teamDocs = await db.getDocs("Document", {environment: env.friendlyId, dataType: "match"});

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
            var getPreparedAnalysis = prepareAnalysis(defaultAnalysis, schema, documents, matches, [parseInt(teamNumber)], env.settings.competitionYear + env.settings.competitionCode);
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

        sendBackTeam.matches = sendBackTeam.matches.sort((a,b) => a.matchNumber - b.matchNumber);

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
            var getPreparedAnalysis = prepareAnalysis(defaultAnalysis, schema, documents, matches, [parseInt(teamNumber)], env.settings.competitionYear + env.settings.competitionCode);
            sendBackTeam.analysis = getPreparedAnalysis;
        }

        matches = matches.sort((a, b) => a.matchNumber - b.matchNumber);

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

    try{
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
                color: dataPiece.Color,
                type: "tablet",
                disabled: dataPiece.Disabled,
                generic: dataPiece.Schema == "Paper Scouting" || dataPiece.Number < 0
            }

            if(generatedData.generic){
                generatedData.match = 0;
            }

            if(env.settings.matchType == "Playoff"){
                generatedData.match += 900;
            }

            var allDocs = await db.getDocs("Document", {environment: env.friendlyId, competition: env.settings.competitionYear + env.settings.competitionCode});
            var prevDoc = allDocs.find((doc) => JSON.parse(doc.json).identifier == dataPiece.Identifier);
            if(prevDoc != undefined){

                if(JSON.parse(prevDoc.json).team == generatedData.team){
                    await db.updateDoc("Document", {_id: prevDoc._id}, {json: JSON.stringify(generatedData), datetime: new Date(dataPiece.Created)});
                    continue;
                }
                
            }
            


            var document = {
                environment: env.friendlyId,
                dataType: "match",
                json: JSON.stringify(generatedData),
                datetime: new Date(dataPiece.Created),
                competition: env.settings.competitionYear + env.settings.competitionCode,
                name: ""
            }

            var similarDoc = allDocs.find((doc) => JSON.parse(doc.json).match == generatedData.match && JSON.parse(doc.json).team == dataPiece.Team);
            if(similarDoc != undefined && dataPiece.Number > 0){
                document.flagged = true;
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
    }catch(e){
        res.status(500).json({message: "Error submitting data!"});
    }
    
    

    
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
    if(rankings != undefined){
        rankings.forEach((ranking) => {

            var rankingObject = {
                team: ranking["teamNumber"],
                rank: ranking["rank"],
                record: {
                    wins: ranking["wins"],
                    losses: ranking["losses"],
                    ties: ranking["ties"]
                },
                rankingPoints: ranking["sortOrder1"],
                tiebreaker: ranking["sortOrder2"],
                matchesPlayed: ranking["matchesPlayed"]
            }
    
            if(ranking["teamNumber"] == env.settings.team){
                var previousRankingObject = env.cachedCompetitionData.rankings.find(r => r.team == ranking["teamNumber"]);
                if(previousRankingObject != undefined){
                    // send notification ONLY if ranking or RP is different
                    if(previousRankingObject.rank != rankingObject.rank || previousRankingObject.rankingPoints != rankingObject.rankingPoints){
                        var message = {
                            title: "Ranking Update 🏆",
                            body: `We detected an update to ${ranking["teamNumber"]}'s ranking...\nCurrent Ranking: ${rankingObject.rank}\nCurrent RP: ${rankingObject.rankingPoints}\nTiebreaker Points: ${rankingObject.tiebreaker}`,
                            data: {
                                team: ranking["teamNumber"].toString()
                            }
                        }
                        sendNotificationAll(message.title, message.body, message.data, "general");
                    }
                }
            }else{

            }
    
            finalRankings.push(rankingObject);
        });
    }
    

    var fRes2 = await firstApiTools.getSimpleMatchResults(year, competition, matchType);
    

    var latestMatch = 0;
    var matchResults = fRes2["Matches"];
    if(matchResults != undefined){
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
    }
    
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
    
    var matches = await db.getDocs("Match", {environment: env.friendlyId, competition: year + competition});
    if((env.cachedCompetitionData.currentMatch != cache.currentMatch && matchResults != undefined)){
        
        var matchToCheckQueue = matches.find((m => m.matchNumber == cache.currentMatch+2));
        if(matchToCheckQueue != undefined){
            var areWeIn = matchToCheckQueue.teams.find(t => t.team == env.settings.team) != undefined;
            if(areWeIn){
                var redTeamString = "";
                var blueTeamString = "";
                matchToCheckQueue.teams.forEach((team) => {
                    if(team["color"] == "Red"){
                        redTeamString += team["team"] + ", ";
                    }else{
                        blueTeamString += team["team"] + ", ";
                    }
                });
                redTeamString = redTeamString.substring(0, redTeamString.length - 2);
                blueTeamString = blueTeamString.substring(0, blueTeamString.length - 2);
                var message = {
                    title: "We're Almost Up 🔔",
                    body: `We are in Match ${matchToCheckQueue["matchNumber"]}! Currently, Match ${cache.currentMatch} is playing...\n🔴 - ${redTeamString}\n🔵 - ${blueTeamString}`,
                    data: {
                        match: matchToCheckQueue["matchNumber"].toString()
                    }
                }
                sendNotificationAll(message.title, message.body, message.data, "queue");
            }

        }
    }else{
        var ourNextMatches = matches.filter((match) => match.teams.find((team) => team.team == env.settings.team) != undefined && match.results.finished == false);
        if(ourNextMatches.length > 0){
            var nextMatch = ourNextMatches[0];
            
            var timeLeft = nextMatch.planned.getTime() - new Date().getTime();
            var minutes = Math.floor(timeLeft / 1000 / 60);
            if(minutes < 25 && minutes > 10 && minutes % 3 == 0){
                var redTeamString = "";
                var blueTeamString = "";
                matchToCheckQueue.teams.forEach((team) => {
                    if(team["color"] == "Red"){
                        redTeamString += team["team"] + ", ";
                    }else{
                        blueTeamString += team["team"] + ", ";
                    }
                });
                redTeamString = redTeamString.substring(0, redTeamString.length - 2);
                blueTeamString = blueTeamString.substring(0, blueTeamString.length - 2);
                var message = {
                    title: "Time's Awaiting 🔔",
                    body: `We are in Match ${matchToCheckQueue["matchNumber"]} in ${minutes} minutes! Currently, Match ${cache.currentMatch} is playing...\n🔴 - ${redTeamString}\n🔵 - ${blueTeamString}`,
                    data: {
                        match: matchToCheckQueue["matchNumber"].toString()
                    }
                }
                sendNotificationAll(message.title, message.body, message.data, "queue");
            }
        }

    }

    await db.updateDoc("Environment", {_id: env._id}, {cachedCompetitionData: cache});

    return cache;
}

router.get("/sendNotif*", async(req, res,next) => {
    var title = req.query.title;
    var body = req.query.body;
    var topic = req.query.topic;

    sendNotificationAll(title, body, {match: "22"}, topic);
    res.send(200);
})

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

router.get("/quick/download", async (req, res, next) => {
    var env = await authTools.getEnvironment(environment);

    var analysisSets = await db.getDocs("AnalysisSet", {environment: env.friendlyId});
    var schemas = await db.getDocs("Schema", {environment: env.friendlyId});

    var matches = await db.getDocs("Match", {environment: env.friendlyId, competition: env.settings.competitionYear + env.settings.competitionCode});
    var documents = await db.getDocs("Document", {environment: env.friendlyId, competition: env.settings.competitionYear + env.settings.competitionCode});
    var rankings = env.cachedCompetitionData.rankings;

    res.status(200).json({
        analysisSets: analysisSets,
        schemas: schemas,
        matches: matches,
        documents: documents,
        rankings: rankings
    });
});

router.get("/quick/state", async (req, res, next) => {
    var env = await authTools.getEnvironment(environment);

    var currentMatch = env.cachedCompetitionData.currentMatch;
    var competitionName = env.cachedCompetitionData.competitionName;
    var location = env.cachedCompetitionData.location;
    
    var currentlyRunning = true;
    var allMatches = await db.getDocs("Match", {environment: env.friendlyId, competition: env.settings.competitionYear + env.settings.competitionCode});
    allMatches = allMatches.sort((a,b) => a.matchNumber - b.matchNumber);
    var teamsDb = await db.getDocs("Team", {environment: env.friendlyId});
    var teamNumbers = [];
    allMatches.forEach((match) => {
        if(match.results.finished == false){
            match.results = {
                finished: false
            }
        }
        match.teams.forEach((team) => {
            if(teamNumbers.indexOf(team.team) == -1){
                teamNumbers.push(team.team);
            }
        });
    });
    var teams = [];

    teamNumbers.forEach((teamNumber) => {
        var team = teamsDb.find((team) => team.teamNumber == teamNumber);
        if(team != undefined){
            teams.push({
                teamNumber: teamNumber,
                teamName: team.name
            });
        }else{
            teams.push({
                teamNumber: teamNumber,
                teamName: "Unknown FIRST Team"
            });
        }
    });

    teams = teams.sort((a,b) => a.teamNumber - b.teamNumber);

    var ourNextMatches = allMatches.filter((match) => match.teams.find((team) => team.team == env.settings.team) != undefined && match.results.finished == false);
    
    var ourNextMatch = -1;
    if(ourNextMatches.length > 0){
        ourNextMatch = ourNextMatches[0];
        ourNextMatch.documents = [];
        var color = "";
        ourNextMatch.teams.forEach(t => {
            if(t.team.toString() == env.settings.team.toString()){
                color = t.color;
            }
        })
        ourNextMatch.color = color;
    }
    var currentMatchType = env.settings.matchType;
    console.log(env.settings);
    var largerMatches = allMatches.filter((match) => {return match.matchNumber >= currentMatch});
    currentlyRunning = largerMatches.length > 0;

    res.status(200).json({currentMatch: currentMatch, ourNextMatch: ourNextMatch, currentlyRunning: currentlyRunning, matchType: currentMatchType, competitionName: competitionName, location: location, matches: allMatches, teamNumber: env.settings.team, teams: teams, rankings: env.cachedCompetitionData.rankings});
    
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

router.get("/first/clear", async (req, res, next) => {

    var env = await authTools.getEnvironment(environment);
    env.cachedCompetitionData = {
        rankings: [],
        matches: []
    };
    await db.updateDoc("Environment", {friendlyId: env.friendlyId}, {cachedCompetitionData: env.cachedCompetitionData});
    
    var allMatches = await db.getDocs("Match", {environment: env.friendlyId, competition: env.settings.competitionYear + env.settings.competitionCode});
    for(var i = 0; i < allMatches.length; i++){
        await db.deleteDoc("Match", {_id: allMatches[i]._id});
    }

    res.status(200).json({success: true});
});

router.get("/first/results*", async(req, res, next) => {
    var env = await authTools.getEnvironment(environment);

    var year = req.query.year;
    var competition = req.query.competition;
    var matchType = req.query.matchType;
    if(matchType != "Qualification" && matchType != "Playoff" && matchType != "Practice" && matchType != "None"){
        matchType = env.settings.matchType;
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


               

                

                var previousStats = {
                    finished: existingMatch.results.finished,
                    red: existingMatch.results.red,
                    blue: existingMatch.results.blue
                }

               

                existingMatch.results.finished = true;


                var redAlliance = match["alliances"].find(a => a.alliance == "Red");
                if(redAlliance == undefined){
                    throw "Red alliance not found!";
                }
                if(redAlliance["totalPoints"] == null){
                    existingMatch.results.finished = false;
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
                if(blueAlliance["totalPoints"] == null){
                    existingMatch.results.finished = false;
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


                if(previousStats.red != existingMatch.results.red || previousStats.blue != existingMatch.results.blue || previousStats.finished != existingMatch.results.finished){
                    var redTeams = existingMatch.teams.filter(t => t.color == "Red");
                    var redString = "";
                    redTeams.forEach((t) => {
                        redString += t.team + ", ";
                    });
                    if(redString != ""){
                        redString = redString.substring(0, redString.length-2);
                    }

                    var blueTeams = existingMatch.teams.filter(t => t.color == "Blue");
                    var blueString = "";
                    blueTeams.forEach((t) => {
                        blueString += t.team + ", ";
                    });
                    if(blueString != ""){
                        blueString = blueString.substring(0, blueString.length-2);
                    }

                    
                    var message = {
                        title: "Match " + existingMatch.matchNumber + " Results Updated",
                        body: `There's been an update to Match Scores!\n🔴 (${redString}) - ${existingMatch.results.red}pts (${existingMatch.results.redStats == undefined ? "?" : existingMatch.results.redStats.rp} RP)\n🔵 (${blueString}) - ${existingMatch.results.blue}pts (${existingMatch.results.blueStats == undefined ? "?" : existingMatch.results.blueStats.rp} RP)\n${existingMatch.results.blue > existingMatch.results.red ? "Blue Wins!" : (existingMatch.results.blue < existingMatch.results.red ? "Red Wins!" : "It's a Tie!")}`,
                        data: {
                            match: existingMatch["matchNumber"].toString()
                        }
                    }

                    if(match["matchLevel"] == "Playoff"){
                        message.title = "Playoff Match " + (existingMatch.matchNumber-900) + " Results Updated";
                        message.body = `There's been an update to Match Scores!\n🔴 (${redString}) - ${existingMatch.results.red}pts\n🔵 (${blueString}) - ${existingMatch.results.blue}pts\n${existingMatch.results.blue > existingMatch.results.red ? "Blue Wins!" : (existingMatch.results.blue < existingMatch.results.red ? "Red Wins!" : "It's a Tie!")}`
                    }
                    

                    var weAreInMatch = existingMatch.teams.find((t) => t.team.toString() == env.settings.team.toString()) != undefined;
                    if(weAreInMatch){
                        sendNotificationAll(message.title, message.body, message.data, "results");
                    }else{
                        sendNotificationAll(message.title, message.body, message.data, "resultsAll");
                    }
                }

                
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