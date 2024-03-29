function get(link, headers, callback){
    $.ajax({
        url: link,
        type: "GET",
        headers: headers,
        success: function(data){
            callback(true, data);
        },
        error: function(err){
            callback(false, err);
        }
    })
}

function post(link, headers, data, callback){
    $.ajax({
        url: link,
        type: "POST",
        headers: headers,
        data: data,
        success: function(data){
            callback(true, data);
        },
        error: function(err){
            callback(false, err);
        }
    })
}

var analysises = [];
var matches = [];
var defaultTeam = undefined;








var currentSetupView = "";


function switchSetupView(view){
    currentSetupView = view;
    Array.from(document.getElementsByClassName("setup")).forEach(e => {
        e.style.display = "none"
    }) 
    Array.from(document.getElementsByClassName("setupbutton")).forEach(e => {
        e.style.backgroundColor = ""
    }) 
    try{
        document.querySelector(".setup[data-id='" + view + "']").style.display = "";
        document.querySelector(".setupbutton[data-id='" + view + "']").style.backgroundColor = "#680991";
    }catch(e){

    }
    
    
}

switchSetupView("Match")



const urlParams = new URLSearchParams(window.location.search);


if(urlParams.get('automatic') == "yes"){
    switchSetupView("Loading")
}



function getAllData(){
    get("/api/analysis/all", {}, function(success, data){
        if(success){
            analysises = data["analysis"];

            document.getElementById("analysis_sets_manual").innerHTML = "";
            analysises.forEach(function(analysis){
                document.getElementById("analysis_sets_manual").innerHTML += `
                    <option value="${analysis._id}">${analysis.Name}</option>
                `
            });
            document.getElementById("analysis_sets_match").innerHTML = "";
            analysises.forEach(function(analysis){
                document.getElementById("analysis_sets_match").innerHTML += `
                    <option value="${analysis._id}">${analysis.Name}</option>
                `
            });
            
        }
    });
    
    get("/api/environment", {}, function(success, data){
        defaultTeam = data["environment"]["settings"]["team"];
       
        get("/api/matches", {}, function(success, data) {
            if(success){
                matches = data["matches"]
                var automatic = urlParams.get('automatic');
                var team = urlParams.get('teamNumber');
                
                var automaticType = urlParams.get('automaticType');

                
                
                if(automatic == "yes"){
                    // automatically generate based on the next match number of OUR TEAM
                    



                    if(automaticType == "team"){
                        switchSetupView("Manual");
                        var teamToUse = defaultTeam;
                        if(team != undefined && team != null){
                            teamToUse = team;
                        }


                        var analysis = urlParams.get('analysis');
                        if(analysis != undefined && analysis != null){
                            var applicableAnalysis = analysises.find(a => a.Name == analysis);
                            document.getElementById("analysis_sets_manual").value = applicableAnalysis._id;
                        }

                        document.getElementById("team_numbers").value = teamToUse;
                        selectAnalysis();
                    }
                    else{
                        switchSetupView("Match");
                        var teamToUse = defaultTeam;
                        if(team != undefined && team != null){
                            teamToUse = team;
                        }
                        

                        var analysis = urlParams.get('analysis');
                        if(analysis != undefined && analysis != null){
                            var applicableAnalysis = analysises.find(a => a.Name == analysis);
                            document.getElementById("analysis_sets_match").value = applicableAnalysis._id;
                        }

                        var teamMatches = matches.filter(m => m.teams.find(t => t.team == teamToUse) != undefined);
                        teamMatches.sort((a, b) => parseInt(a.matchNumber) - parseInt(b.matchNumber));
                        var nextMatchUp = teamMatches[teamMatches.length - 1];
                        for(var i = 0; i < teamMatches.length; i++){
                            if(!teamMatches[i].results.finished){
                                nextMatchUp = teamMatches[i];
                                break;
                            }
                        }
                        
                        
                        if(nextMatchUp != undefined){
                            document.getElementById("match_number").value = nextMatchUp.matchNumber;
                            document.getElementById("match_color").value = nextMatchUp.teams.find(t => t.team == teamToUse).color;

                            var preferredColor = urlParams.get('color');
                            var preferredMatch = urlParams.get('matchNumber');

                            if(preferredColor != undefined && preferredColor != null){
                                document.getElementById("match_color").value = preferredColor;
                            }
                            if(preferredMatch != undefined && preferredMatch != null){
                                document.getElementById("match_number").value = preferredMatch;
                            }


                            
                            selectAnalysis();
                        }
                    }
                    



                }
            }
        })
        
    });
}
getAllData();

var compData = undefined;

function reselectAnalysis(){
    var teams = document.getElementById("team_numbers_re").value;
    document.getElementById("team_numbers").value = teams;

    var matchNum = document.getElementById("match_number_re").value;
    document.getElementById("match_number").value = matchNum;

}
var partSets = {};
var requestedDataPoints = {};
function addData(partId, team, key, value){
    if(Object.keys(partSets[partId][team]).find(k => k == key)){
        // then add to obj
        partSets[partId][team][key].push(value)
    }else{
        // then create obj
        partSets[partId][team][key] = [value];
    }
}

function selectAnalysis(){
    var teams = [];
    var separate = false;
    var analysis = "";

    if(currentSetupView == "Match"){
        var matchNum = document.getElementById("match_number").value;
        var color = document.getElementById("match_color").value
        var match = matches.find(m => m.matchNumber == parseInt(matchNum));
        if(match == undefined){
            return;
        }
        var localTeams = [];
        match.teams.forEach(t => {
            if(t.color == color){
                localTeams.push(t.team);
            }
            
        })
        teams = localTeams;
        if(teams.length == 0){
            return;
        }
        separate = true;
        analysis = document.getElementById("analysis_sets_match").value;
    }else{
        teams = document.getElementById("team_numbers").value.split(",").map(t => parseInt(t));
        separate = true;
        
        analysis = document.getElementById("analysis_sets_manual").value;
    }   


    document.getElementById("setup_view").style.display = "none";
    document.getElementById("report_view").style.display = "";


    

    var analysisObject = analysises.find(a => a._id == analysis);
    get("/api/first/cache", {}, function(success, data){
        compData = data["cache"];
        post("/api/analysis/documents", {},{analysisId: analysis, schemaId: analysisObject.Schema._id}, function(success, data){
            if(success){
                console.log(data);
    
                var analysis = data["analysis"];
                var allDocs = data["allDocs"];
                var allMatches = data["allMatches"];
    
                partSets = {};
                requestedDataPoints = {};
    
                var schemaFields = [];
                data["schema"].Parts.forEach((part) => {
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
    
                allDocs.forEach((doc) => {
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
    
                allMatches.forEach((match) => {
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

                                finalData[team].push({
                                    name: part.Name,
                                    type: part.Type,
                                    value: final
                                });


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
                            case "Custom":
                                break;


                        }
                    });


                    
                });
    
                console.log(finalData);
                
    
                
    
                // now show onto the report screen
                var fHTML = "";
                var now = new Date();
                if(separate){
    
                    var teamHTML = "";
                    
                    teams.forEach((team) => {
                        var rankingObj = compData.rankings.find(r => r.team == team);
                        if(rankingObj == undefined){
                            teamHTML += `<div style="margin:10px">
                                <span class='text important' style="color:#190024;font-weight:600;margin:5px;font-size:2.2em">${team}</span>
                                
                            </div>`;
                        }else{
                            teamHTML += `<div style="margin:10px">
                                <span class='text important' style="color:#190024;font-weight:600;margin:5px;font-size:2.2em">${team}</span>
                                <span class='text regular' style="color:#190024;margin:5px;font-size:1.7em">${rankingObj == undefined ? "???" : "#"  + rankingObj.rank + " (" + rankingObj.record.wins + "-" + rankingObj.record.losses + "-" + rankingObj.record.ties + ")"}</span>
                                <span class='text regular' style="color:#190024;margin:5px;font-size:1.7em">${rankingObj == undefined ? "???" : rankingObj.rankingPoints + " RP"}</span>
                                
                            </div>`;
                        }
                        
                    });
    
                    fHTML += `
                    <span class="text header" style="color:#190024;font-weight:bold;margin:5px">${analysis.Name}</span>
                    <span class="text important" style="color:#190024;font-weight:500;margin:5px">${now.toLocaleString()}</span>
                    <div style="border: 2px solid #190024; padding:12px 0px; border-radius:8px;width:100%;margin-bottom:40px;margin-top:20px">
                        
                        
                        <div class="flex_apart" style="justify-content:space-around">
                            ${teamHTML}
                        </div>
                    </div>
                    
                   
                    `
    
    
                    finalData[Object.keys(finalData)[0]].forEach((part) => {
                        
                        fHTML += `<div class='text header' style="color:#190024;margin-bottom:10px;margin-top:20px;">${part.name}</div>`;
                        var tlHTML = "";
    
                        switch(part.type){
                            case "Custom":
                                teams.forEach((team) => {
                                    var record = finalData[team].find(p => p.name == part.name);
                                    tlHTML += `<div class='text important' style="color:#190024;font-weight:600;margin: 0px; 10px">${record.value.toFixed(2)}</div>`;
                                });
                                fHTML += `
                                <div style="border: 1px solid #190024; padding:8px 0px; border-radius:8px;width:100%">
                                    <div class='flex_apart' style-"width:50%;padding:10px 0px;">${tlHTML}</div>
                                </div>
                                 <hr style="margin-top:20px;margin-bottom:10px"/>
                                `;
                                break;
                            case "Number":
                                teams.forEach((team) => {
                                    var record = finalData[team].find(p => p.name == part.name);
                                    tlHTML += `<div class='text important' style="color:#190024;font-weight:600;margin: 0px; 10px">${record.value.toFixed(2)}</div>`;
                                });
                                fHTML += `
                                <div style="border: 1px solid #190024; padding:8px 0px; border-radius:8px;width:100%">
                                    <div class='flex_apart' style-"width:50%;padding:10px 0px;">${tlHTML}</div>
                                </div>
                                 <hr style="margin-top:20px;margin-bottom:10px"/>
                                `;
                                break;
                            case "Grid":
                                teams.forEach((team) => {
                                    tlHTML += `<div class='text important' style="color:#190024;font-weight:600;margin: 5px; 10px">${team}</div>`;
                                    var record = finalData[team].find(p => p.name == part.name);
                                    
                                    
                                    if(record.valueRed == undefined){
                                        return;
                                    }
                                    var maxRed = record.maxRed;
                                    var maxBlue = record.maxBlue;
                                    if(maxRed == 0){
                                        maxRed = 1;
                                    }
                                    if(maxBlue == 0){
                                        maxBlue = 1;
                                    }
                                    var gridHTML = "";

                                    for(var r = 0; r < record.valueRed.length; r+=1){
                                        var rowRed = record.valueRed[r];
                                        var rowBlue = record.valueBlue[r];

                                        var rowHTML = ""

                                        for(var c = 0; c < rowRed.length; c+=1){
                                            var colRed = rowRed[c];
                                            var colBlue = rowBlue[c];

                                            if(part.separate){
                                                rowHTML += `<div class="text regular" style="border:2px solid #190024;border-radius:8px;font-weight:600;margin:4px;padding:4px;font-size:1.7em">
                                                    <div style="border-radius:4px;font-weight:600;padding:4px 20px;margin: 4px 0px;color:${colRed/maxRed > 0.5 ? "#ffffff" : "#190024"};background-color:rgba(25,0,26,${(colRed)/(maxRed).toFixed(3)})">${colRed}</div>
                                                    <div style="border-radius:4px;font-weight:600;padding:4px 20px;margin: 4px 0px;color:${colBlue/maxBlue > 0.5 ? "#ffffff" : "#190024"};background-color:rgba(25,0,26,${(colBlue)/(maxBlue).toFixed(3)})">${colBlue}</div>
                                                </div>`;
                                            }else{
                                                rowHTML += `<div class="text regular" style="border:2px solid #190024;border-radius:8px;font-weight:600;margin:4px;padding:10px 15px;color:${(colRed + colBlue)/(maxRed + maxBlue) > 0.5 ? "#ffffff" : "#190024"};background-color:rgba(25,0,26,${(colRed + colBlue)/(maxRed + maxBlue).toFixed(3)})">${colRed + colBlue}</div>`;
                                            }
                                            
                                        }
                                        gridHTML += `<div class="flex_center">${rowHTML}</div>`;
                                    }
    

                                    tlHTML += `<div style="margin-bottom:20px">${gridHTML}</div>`;

                                    
                                });
                                fHTML += `
                                <div class="flex_center">
                                <div>${tlHTML}</div>
                                </div>
                                <hr style="margin-top:20px;margin-bottom:10px"/>
                                `;
                                break;
                            case "FIRST":
                                teams.forEach((team) => {
                                    var record = finalData[team].find(p => p.name == part.name);
                                    tlHTML += `<div class='text important' style="color:#190024;font-weight:600;margin: 0px; 10px">${record.value.toFixed(2)}</div>`;
                                });
                                fHTML += `
                                <div style="border: 1px solid #190024; padding:8px 0px; border-radius:8px;width:100%">
                                    <div class='flex_apart' style-"width:50%;padding:10px 0px;">${tlHTML}</div>
                                </div>
                                 <hr style="margin-top:20px;margin-bottom:10px"/>
                                `;
                                break;
                            case "Frequency":
                                teams.forEach((team) => {
                                    var record = finalData[team].find(p => p.name == part.name);
                                    var rHTML = "";

                                    for(var i = 0; i < record.fields.length; i+=1){
                                        rHTML += `<div class='text important' style="color:#190024;font-weight:600"><span style="font-size:24px;font-weight:500">${record.fields[i]}</span> - ${record.values[i]}%</div>`
                                    }


                                    tlHTML += `<div style="margin:0px 10px">
                                        ${rHTML}
                                    </div>`
                                });

                                fHTML += `
                                <div style="border: 1px solid #190024; padding:8px 0px; border-radius:8px;width:100%">
                                    <div class='flex_apart' style-"width:50%;padding:10px 0px;">${tlHTML}</div>
                                </div>
                                 <hr style="margin-top:20px;margin-bottom:10px"/>
                                `;
                                break;

                            case "Graph":
                                teams.forEach((team) => {
                                    
                                    // remove all spaces from part name
                                    var graphName = part.name.replace(/\s/g, '');
                                    var record = finalData[team].find(p => p.name == part.name);
                                    fHTML += `
                                    <div class='text important' style="color:#190024;font-weight:600;margin: 5px; 10px">${team}</div>
                                    <div class='text regular' style="color:#190024;font-weight:600;margin: 5px; 10px;font-size:1.7em">Average Value: ${Math.round(record.average, 2)}</div>
                                    <div id="graph_${graphName}_${team}" style="font-size:30px"></div>
                                    `;
                                });
                                
                                break;
                        }
                        
                        
                    });
                    document.getElementById("report").innerHTML = fHTML;


                    finalData[Object.keys(finalData)[0]].filter(p => p.type == "Graph").forEach((part) => {
                        teams.forEach((team) => {
                            var graphName = part.name.replace(/\s/g, '');
                            var el = (`#graph_${graphName}_${team}`).toString();
                            var record = finalData[team].find(p => p.name == part.name);

                            var dataAverage = record.data.reduce((a, b) => a + b, 0) / record.data.length;

                            var graphdata = {
                                labels: record.matches.map((match) => "#" + match),
                                datasets: [
                                    { values: record.data }
                                ]
                            }
                            new frappe.Chart( el, {
                                data: graphdata,
                                type: 'bar',
                                height: 300,
                                colors: ['black'],
                                valuesOverPoints: 1,
                                tooltipOptions: {
                                    valuesOverPoints: 1
                                },
                                type: 'line',
                                measures: {
                                    titleFontSize: 20,
                                },
                                lineOptions: {
                                    dotSize: 8
                                }
                                
                            });
                        });
                    });

                    
                    

                }
    
                
    
                if(document.getElementById("analysis_print").checked){
                    window.print();
                }
            }
            

        });

    });
    
}


setInterval(() => {
    Array.from(document.querySelectorAll("text")).forEach((el) => {
        el.style.fontSize = "24px";
        el['font-size'] = "24px";
    });
}, 500);