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



function getAllAnalysises(){
    get("/api/analysis/all", {}, function(success, data){
        if(success){
            analysises = data["analysis"];

            document.getElementById("analysis_sets").innerHTML = "";
            analysises.forEach(function(analysis){
                document.getElementById("analysis_sets").innerHTML += `
                    <option value="${analysis._id}">${analysis.Name}</option>
                `
            });
            document.getElementById("analysis_submit").style.display = "";
        }
    });
}
getAllAnalysises();

function selectAnalysis(){
    var teams = document.getElementById("team_numbers").value.split(",").map(t => parseInt(t));
    var separate = document.getElementById("team_separate").checked;
    document.getElementById("setup_view").style.display = "none";
    document.getElementById("report_view").style.display = "";
    var analysis = document.getElementById("analysis_sets").value;

    var analysisObject = analysises.find(a => a._id == analysis);
    post("/api/analysis/documents", {},{analysisId: analysis, schemaId: analysisObject.Schema.id}, function(success, data){
        if(success){
            console.log(data);

            var analysis = data["analysis"];
            var allDocs = data["allDocs"];
            var allMatches = data["allMatches"];

            var partSets = {};
            var requestedDataPoints = {};

            var finalData = undefined;
            if(separate){
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
                        case "FIRST":
                            // just request finalscore
                    }
                });
    
                allDocs.forEach((doc) => {
                    var data = JSON.parse(doc.json);
                    if(!teams.includes(parseInt(data.team))){
                        // not a doc we are looking for
                        return;
                    }
    
                });
    
                allMatches.forEach((match) => {
                    var foundTeam = match.teams.find(t => teams.includes(t.team));
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
                                if(Object.keys(partSets[partId][foundTeam.team]).find(k => k == key)){
                                    // then add to obj
                                    partSets[partId][foundTeam.team][key].push(stats[key])
                                }else{
                                    // then create obj
                                    partSets[partId][foundTeam.team][key] = [stats[key]]
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
                                if(Object.keys(partSets[partId][foundTeam.team]).find(k => k == key)){
                                    // then add to obj
                                    partSets[partId][foundTeam.team][key].push(stats[key])
                                }else{
                                    // then create obj
                                    partSets[partId][foundTeam.team][key] = [stats[key]]
                                }
                            });
                        });
                    }
    
    
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
                        }
                    });


                    
                });
    
                console.log(finalData);
            }else{
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
                            // just request finalscore
                    }
                });
    
                allDocs.forEach((doc) => {
                    var data = JSON.parse(doc.json);
                    if(!teams.includes(parseInt(data.team))){
                        // not a doc we are looking for
                        return;
                    }
    
                });
    
                allMatches.forEach((match) => {
                    var foundTeam = match.teams.find(t => teams.includes(t.team));
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
    
                console.log(partSets);
    
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
                    }
                });
    
                console.log(finalData);
            }

            

            // now show onto the report screen
            var fHTML = "";
            var now = new Date();
            if(separate){

                var teamHTML = "";
                
                teams.forEach((team) => {
                    teamHTML += `<div class='text regular' style="color:#190024;font-weight:600;margin: 0px; 10px">${team}</div>`;
                });

                fHTML += `
                <div style="border: 2px solid #190024; padding:12px 0px; border-radius:8px;width:100%;margin-bottom:40px">
                    <div class="text caption" style="color:#190024;margin-bottom:10px;font-weight:bold">${analysis.Name}</div>
                    <div class="text caption" style="color:#190024;margin-bottom:20px">Generated at ${now.toLocaleString()}</div>
                    <div class="flex_apart">
                        ${teamHTML}
                    </div>
                </div>
                
               
                `


                finalData[Object.keys(finalData)[0]].forEach((part) => {
                    
                    fHTML += `<div class='text header' style="color:#190024;margin-bottom:10px;margin-top:20px">${part.name}</div>`;
                    var tlHTML = "";

                    switch(part.type){
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
                    }
                    
                    
                });
                document.getElementById("report").innerHTML = fHTML;
            }else{

                var teamString = "";
                
                teams.forEach((team) => {
                    teamString += `<div class='text regular' style="color:#190024;font-weight:600;margin: 0px; 10px">${team}</div>&`;
                });
                teamString = teamString.substring(0, teamString.length - 1);

                fHTML += `
                <div style="border: 2px solid #190024; padding:12px 0px; border-radius:8px;width:100%;margin-bottom:40px">
                    <div class="text caption" style="color:#190024;margin-bottom:10px;font-weight:bold">${analysis.Name}</div>
                    <div class="text caption" style="color:#190024;margin-bottom:20px">Generated at ${now.toLocaleString()}</div>
                    <div class="flex_center">
                        ${teamString}
                    </div>
                </div>
                
               
                `
                finalData.forEach((part) => {
                    switch(part.type){
                        case "Number":
                            fHTML += `
                                <div class="flex_apart" style="width:100%;margin-bottom:10px"> 
                                    <div class='text important' style="color:#190024;margin-right:10px">${part.name}</div>
                                    <div class='text regular' style="color:#190024;font-weight:600">${part.value.toFixed(2)}</div>
                                </div>
                            `
                            break;
                    }
                    
                });
                document.getElementById("report").innerHTML = fHTML;
            }

            


        }
    });
}


