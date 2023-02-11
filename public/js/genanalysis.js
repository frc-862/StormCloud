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
    post("/api/analysis/documents", {},{analysisId: analysis, schemaId: analysisObject.Schema._id}, function(success, data){
        if(success){
            console.log(data);

            var analysis = data["analysis"];
            var allDocs = data["allDocs"];
            var allMatches = data["allMatches"];

            var partSets = {};
            var requestedDataPoints = {};

            var schemaFields = [];
            data["schema"].Parts.forEach((part) => {
                part.Components.forEach((component) => {
                    if(component.Type == "Label"){
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
                    var foundTeam = teams.find(t => t == parseInt(data.team));
                    if(!teams.includes(parseInt(data.team))){
                        // not a doc we are looking for
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
                            if(field.componentType == "Step" || field.componentType == "Timer"){
                                // most likely just requesting number only
                                if(Object.keys(partSets[partId][foundTeam]).find(k => k == key)){
                                    // then add to obj
                                    partSets[partId][foundTeam][key].push(useData)
                                }else{
                                    // then create obj
                                    partSets[partId][foundTeam][key] = [useData]
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
                                            gridData.extend(rowArr);
                                        });

                                        var count = 0;
                                        gridData.forEach((num) => {
                                            if(parseInt(num) != -1){
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
                                            gridData.push(cols);
                                        });

                                        putData = gridData;
                                        break;

                                }
                                if(Object.keys(partSets[partId][foundTeam]).find(k => k == key)){
                                    // then add to obj
                                    partSets[partId][foundTeam][key].push(putData)
                                }else{
                                    // then create obj
                                    partSets[partId][foundTeam][key] = [putData]
                                }
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
                            case "Grid":
                                // get one grid for each team!
                                var final = [];

                                Object.keys(partData).forEach((key) => {
                                    try{
                                        if(partData[key].length == 0){
                                            return;
                                        }
                                        var localFinalForTeam = [];
                                        
                                        var height = partData[key][0].length;
                                        var width = partData[key][0][0].length;
    
                                        for(var i = 0; i < height; i++){
                                            var row = [];
                                            for(var j = 0; j < width; j++){
                                                row.push(0);
                                            }
                                            localFinalForTeam.push(row);
                                        }
    
                                        partData[key].forEach((grid) => {
                                            grid.forEach((row, i) => {
                                                row.forEach((col, j) => {
                                                    var toAdd = 0;
                                                    if(parseInt(grid[i][j]) != -1){
                                                        toAdd = 1;
                                                    }
                                                    localFinalForTeam[i][j] += toAdd;
                                                });
                                            });
                                        });
    
                                        final.push(localFinalForTeam);
                                    }catch(e){
                                        // if it reaches here, then it is of a different size
                                    }
                                    
                                });


                                for(var i = 1; i < final.length; i++){
                                    for(var r = 0; r < final[i].length; r++){
                                        for(var c = 0; c < final[i][r].length; c++){
                                            if(final[i][r][c] != -1){
                                                final[0][r][c] += final[i][r][c];
                                            }
                                        }
                                    }
                                }
                            
                                finalData[team].push({
                                    name: part.Name,
                                    type: part.Type,
                                    value: final[0]
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
    
                allDocs.forEach((doc) => {
                    var data = JSON.parse(doc.json);
                    if(!teams.includes(parseInt(data.team))){
                        // not a doc we are looking for
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
                            if(field.componentType == "Step" || field.componentType == "Timer"){
                                // most likely just requesting number only
                                if(Object.keys(partSets[partId]).find(k => k == key)){
                                    // then add to obj
                                    partSets[partId][key].push(useData)
                                }else{
                                    // then create obj
                                    partSets[partId][key] = [useData]
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
                                            gridData.extend(rowArr);
                                        });

                                        var count = 0;
                                        gridData.forEach((num) => {
                                            if(parseInt(num) != -1){
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
                                            gridData.push(cols);
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
    
                allMatches.forEach((match) => {
                    var foundTeams = match.teams.filter(t => teams.includes(t.team));
                    if(foundTeams == undefined || foundTeams.length == 0){
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

                            for(var i = 1; i < final.length; i++){
                                for(var r = 0; r < final[i].length; r++){
                                    for(var c = 0; c < final[i][r].length; c++){
                                        if(final[i][r][c] != -1){
                                            final[0][r][c] += final[i][r][c];
                                        }
                                    }
                                }
                            }

                            finalData.push({
                                name: part.Name,
                                type: part.Type,
                                value: final[0]
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
                        case "Grid":
                            teams.forEach((team) => {
                                tlHTML += `<div class='text regular' style="color:#190024;font-weight:600;margin: 0px; 10px">${team}</div>`;
                                var record = finalData[team].find(p => p.name == part.name);
                                if(record.value == undefined){
                                    return;
                                }
                                var gridHTML = "";

                                record.value.forEach((row) => {
                                    var rowHTML = "";
                                    row.forEach((col) => {
                                        rowHTML += `<div class="text regular" style="border:2px solid #190024;border-radius:8px;font-weight:600;margin:4px;padding:10px;color:#190024">${col}</div>`;
                                    });
                                    gridHTML += `<div class="flex_center">${rowHTML}</div>`;
                                });
                                tlHTML += `<div style="margin-bottom:20px">${gridHTML}</div>`;
                            });
                            fHTML += `
                            <div class="flex_center">
                            <div>${tlHTML}</div>
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


