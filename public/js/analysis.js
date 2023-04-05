var overlaySaveData = {};
var overlaySaveFunction = ()=>{};

var environmentData = {};
var settings = {};
var schemas = [];

function generateUUID(){
    var dt = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (dt + Math.random()*16)%16 | 0;
        dt = Math.floor(dt/16);
        return (c=='x' ? r :(r&0x3|0x8)).toString(16);
    });
    return uuid;
}

function readFromCookie(name){
    var result = document.cookie.match(new RegExp(name + '=([^;]+)'));
    result && (result = result[1]);
    return result;
}

function writeToCookie(name, value){
    

    document.cookie = name + "=" + value;

}

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

function deleteAPI(link, headers, data, callback){
    $.ajax({
        url: link,
        type: "DELETE",
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

var currentAnalysisSet = {
    Name: "",
    Updated: "",
    Parts: [],
    Schema: {
        id: "",
        Name: ""
    }
};

function refreshEnvironment(){
    get("/api/environment", {}, (success, data) => {
        environmentData = data["environment"];

        var needToSetup = data["needsSetup"];
            
        if(needToSetup){
            window.location = "/setup";
            return;
        }

        var account = readFromCookie("token");
        if(account == undefined || account == ""){
            window.location = "/login";
            return;
        }
        settings = data["environment"]["settings"];
        schemas = data["schemas"];


        var selectorHTML = ""
        schemas.forEach((schema) => {
            selectorHTML += `<option value="${schema._id}">${schema.Name}</option>`
        });
        document.querySelector("#analysisSchema").innerHTML = selectorHTML;
        changeSchema();

    });
}
refreshEnvironment();

function changeSchema(){
    var val = document.querySelector("#analysisSchema").value;
    currentAnalysisSet.Schema = {
        id: val,
        Name: schemas.find((schema) => {return schema._id == val}).Name
    };

    var schema = schemas.find((schema) => {return schema._id == val});
    var n = 0;
    schemaItems = [];
    schema.Parts.forEach((part) => {
        part.Components.forEach((component) => {
            if(component.Type == "Label"){
                return;
            }
            schemaItems.push({
                part: part.Name,
                component: component.Name,
                componentType: component.Type
            });
        });
    });
    refreshAnalysisSet();
}

var schemaItems = [];

function refreshAnalysisSet(){
    document.querySelector("#items").innerHTML = "";
    var fHTML = "";

    
    

    currentAnalysisSet.Parts.forEach((part) => {
        var partHTML = "";

        switch(part.Type){
            case "Number":


                var selectHTML = "";
                
            
                schemaItems.forEach((item) => {
                    
                    selectHTML += `<option value="${item.part}---${item.component}" ${part.Data["SchemaFields"] != undefined && part.Data["SchemaFields"].includes(item.part + "---" + item.component) ? "selected" : ""}>${item.part} - ${item.component} (${item.componentType})</option>`
                    
                });
                
                var firstFieldData = "";
                if(part.Data["FIRSTFields"] != undefined){
                    part.Data["FIRSTFields"].forEach((field) => {
                        firstFieldData += `${field}\n`;
                    });
                    
                }

                partHTML = `
                <div class="flex_center" style="width:100%">
                    <span class="text small" style="margin: 5px 10px;text-align:left">Interpret Final Number</span>
                    <select value="${part.Data["Stat_Final"]}" class="input text important setting" style="margin:10px;width:50%;pointer-events:all" onchange="setData('${part._id}', 'Stat_Final', this)">
                        <option value="sum" ${part.Data["Stat_Final"] == "sum" ? "selected": ""}>Sum Of...</option>
                        <option value="avg" ${part.Data["Stat_Final"] == "avg" ? "selected": ""}>Average Of...</option>
                        <option value="max" ${part.Data["Stat_Final"] == "max" ? "selected": ""}>Maximum Of...</option>
                        <option value="min" ${part.Data["Stat_Final"] == "min" ? "selected": ""}>Minimum Of...</option>
                        <option value="range" ${part.Data["Stat_Final"] == "range" ? "selected": ""}>Range Of...</option>    
                    
                    </select>
                </div>
                <div class="flex_center" style="width:100%">
                    <span class="text small" style="margin: 5px 10px;text-align:left">Combine Individual Data Points</span>
                    <select value="${part.Data["Stat_Between"]}" class="input text important setting" style="margin:10px;width:50%;pointer-events:all" onchange="setData('${part._id}', 'Stat_Between', this)">
                        <option value="sum" ${part.Data["Stat_Between"] == "sum" ? "selected": ""}>Total Sum</option>
                        <option value="avg" ${part.Data["Stat_Between"] == "avg" ? "selected": ""}>Total Average</option>
                    </select>
                </div>
                <div class="flex_center" style="width:100%">
                    <span class="text small" style="margin: 5px 10px;text-align:left">Use Points Instead of Values </span>
                    <input type="checkbox" data-data="check" onchange="setData('${part._id}', 'UsePoints', this)" ${part.Data["UsePoints"] == "true" ? "checked" : ""}>
                </div>
                <div class="flex_center" style="width:100%">
                    <span class="text small" style="margin: 5px 10px;text-align:left">Use Old Documents</span>
                    <input type="checkbox" data-data="check" onchange="setData('${part._id}', 'UseOtherDocs', this)" ${part.Data["UseOtherDocs"] ? "checked" : ""}>
                </div>
                <div class="flex_center" style="width:100%">
                    
                    <select class="input text regular setting" style="margin:10px;width:50%;pointer-events:all" multiple data-data="multi" onchange="setData('${part._id}', 'SchemaFields', this)">
                        ${selectHTML}
                    </select>

                    <textarea class="input text important setting" style="margin:10px;width:40%;pointer-events:all" placeholder="Enter FIRST Data Points" onchange="setData('${part._id}', 'FIRSTFields', this)" data-data="innerHTML">${firstFieldData}</textarea>

                </div>
                
                `

                break;
            case "Grid":

                
                var gridSelectHTML ="";

                schemaItems.forEach((item) => {
                    
                    if(item.componentType == "Grid"){
                        gridSelectHTML += `<option value="${item.part}---${item.component}" ${part.Data["SchemaFields"] != undefined && part.Data["SchemaFields"].includes(item.part + "---" + item.component) ? "selected" : ""}>${item.part} - ${item.component}</option>`
                    }
                });
                partHTML = `
                <div class="flex_center" style="width:100%">
                    <span class="text small" style="margin: 5px 10px;text-align:left">Show Separate Colors</span>
                    <input type="checkbox" data-data="check" onchange="setData('${part._id}', 'SeparateColors', this)" ${part.Data["SeparateColors"] ? "checked" : ""}>
                </div>
                <div class="flex_center" style="width:100%">
                    <span class="text small" style="margin: 5px 10px;text-align:left">Use Old Documents</span>
                    <input type="checkbox" data-data="check" onchange="setData('${part._id}', 'UseOtherDocs', this)" ${part.Data["UseOtherDocs"] ? "checked" : ""}>
                </div>
                <div class="flex_center" style="width:100%">
                    <span class="text small" style="margin: 5px 10px;text-align:left">Display Style</span>
                    <select value="${part.Data["Display"]}" class="input text important setting" style="margin:10px;width:50%;pointer-events:all" onchange="setData('${part._id}', 'Display', this)">
                        <option value="heatmap" ${part.Data["Display"] == "heatmap" ? "selected": ""}>Heatmap</option>
                        <option value="number" ${part.Data["Display"] == "number" ? "selected": ""}>Number</option>
                    </select>
                </div>

                <div class="flex_center" style="width:100%">
                    
                    <select class="input text regular setting" style="margin:10px;width:80%;pointer-events:all" multiple data-data="multi" onchange="setData('${part._id}', 'SchemaFields', this)">
                        ${gridSelectHTML}
                    </select>

                    

                </div>

                
                `;
                break;
            case "Frequency":
                var selectSelectHTML ="";

                schemaItems.forEach((item) => {
                    
                    selectSelectHTML += `<option value="${item.part}---${item.component}" ${part.Data["SchemaFields"] != undefined && part.Data["SchemaFields"].includes(item.part + "---" + item.component) ? "selected" : ""}>${item.part} - ${item.component}</option>`
                });

                var firstFieldData = "";
                if(part.Data["FIRSTFields"] != undefined){
                    part.Data["FIRSTFields"].forEach((field) => {
                        firstFieldData += `${field}\n`;
                    });
                    
                }

                partHTML = `
                <div class="flex_center" style="width:100%">
                    <span class="text small" style="margin: 5px 10px;text-align:left">Use Points Instead of Values </span>
                    <input type="checkbox" data-data="check" onchange="setData('${part._id}', 'UsePoints', this)" ${part.Data["UsePoints"] ? "checked" : ""}>
                </div>
                <div class="flex_center" style="width:100%">
                    <span class="text small" style="margin: 5px 10px;text-align:left">Use Old Documents</span>
                    <input type="checkbox" data-data="check" onchange="setData('${part._id}', 'UseOtherDocs', this)" ${part.Data["UseOtherDocs"] ? "checked" : ""}>
                </div>
                <div class="flex_center" style="width:100%">
                    
                    <select class="input text regular setting" style="margin:10px;width:50%;pointer-events:all" multiple data-data="multi" onchange="setData('${part._id}', 'SchemaFields', this)">
                        ${selectSelectHTML}
                    </select>

                    <textarea class="input text important setting" style="margin:10px;width:40%;pointer-events:all" placeholder="Enter FIRST Data Points" onchange="setData('${part._id}', 'FIRSTFields', this)" data-data="innerHTML">${firstFieldData}</textarea>

                </div>
                `;

                break;

            case "Custom":

                var codeString = "";
                if(part.Data["Code"] != undefined){
                    part.Data["Code"].forEach((line) => {
                        codeString += `${line}\n`;
                    });
                }
                partHTML = `
                <div class="flex_center" style="width:100%">
                            <span class="text small" style="margin: 5px 10px;text-align:left">Interpret Final Number</span>
                            <select value="${part.Data["Stat_Final"]}" class="input text important setting" style="margin:10px;width:50%;pointer-events:all" onchange="setData('${part._id}', 'Stat_Final', this)">
                                <option value="sum" ${part.Data["Stat_Final"] == "sum" ? "selected": ""}>Sum Of...</option>
                                <option value="avg" ${part.Data["Stat_Final"] == "avg" ? "selected": ""}>Average Of...</option>
                                <option value="max" ${part.Data["Stat_Final"] == "max" ? "selected": ""}>Maximum Of...</option>
                                <option value="min" ${part.Data["Stat_Final"] == "min" ? "selected": ""}>Minimum Of...</option>
                                <option value="range" ${part.Data["Stat_Final"] == "range" ? "selected": ""}>Range Of...</option>    
                            
                            </select>
                        </div>
                <div class="flex_center" style="width:100%">
                
                    <div>
                        
                        <div class="flex_center" style="width:100%">
                            <div class="container primarybg clickable" style="padding: 10px;margin:5px;width:200px" data-id="${part._id}" onclick="custom_addDataPiece('${part._id}')">
                                <span class="text regular">Add Data Piece</span>
                            </div>
                        </div>
                        <div class="custom_data_pieces" data-id="${part._id}"></div>
                    </div>
                    <div>
                        <span class="text small" style="margin: 5px 10px;text-align:left">Code (MUST return #)</span>
                        <textarea class="input text important setting" style="margin:10px;width:40%;pointer-events:all" placeholder="Javascript Here" onchange="setData('${part._id}', 'Code', this)" data-data="innerHTML">${codeString}</textarea>
                    </div>
                    
                    
                </div>
                
                `;
                
                break;

            case "Graph":
                var selectHTML = "";
                
            
                schemaItems.forEach((item) => {
                    
                    selectHTML += `<option value="${item.part}---${item.component}" ${part.Data["SchemaFields"] != undefined && part.Data["SchemaFields"].includes(item.part + "---" + item.component) ? "selected" : ""}>${item.part} - ${item.component} (${item.componentType})</option>`
                    
                });
                
                var firstFieldData = "";
                if(part.Data["FIRSTFields"] != undefined){
                    part.Data["FIRSTFields"].forEach((field) => {
                        firstFieldData += `${field}\n`;
                    });
                    
                }
                partHTML = `
                <div class="flex_center" style="width:100%">
                    <span class="text small" style="margin: 5px 10px;text-align:left">Interpret Data Points</span>
                    <select value="${part.Data["Stat_Between"]}" class="input text important setting" style="margin:10px;width:50%;pointer-events:all" onchange="setData('${part._id}', 'Stat_Between', this)">
                        <option value="sum" ${part.Data["Stat_Between"] == "sum" ? "selected": ""}>Sum Of...</option>
                        <option value="avg" ${part.Data["Stat_Between"] == "avg" ? "selected": ""}>Average Of...</option>
                        <option value="max" ${part.Data["Stat_Between"] == "max" ? "selected": ""}>Maximum Of...</option>
                        <option value="min" ${part.Data["Stat_Between"] == "min" ? "selected": ""}>Minimum Of...</option>
                        <option value="range" ${part.Data["Stat_Between"] == "range" ? "selected": ""}>Range Of...</option>    
                    
                    </select>
                </div>
                <div class="flex_center" style="width:100%">
                    <span class="text small" style="margin: 5px 10px;text-align:left">Show Document Data</span>
                    <input type="checkbox" data-data="check" onchange="setData('${part._id}', 'DocumentData', this)" ${part.Data["DocumentData"] ? "checked" : ""}>
                </div>
                <div class="flex_center" style="width:100%">
                    <span class="text small" style="margin: 5px 10px;text-align:left">Use Points Instead of Values </span>
                    <input type="checkbox" data-data="check" onchange="setData('${part._id}', 'UsePoints', this)" ${part.Data["UsePoints"] == "true" ? "checked" : ""}>
                </div>
                
                <div class="flex_center" style="width:100%">
                    
                    <select class="input text regular setting" style="margin:10px;width:50%;pointer-events:all" multiple data-data="multi" onchange="setData('${part._id}', 'SchemaFields', this)">
                        ${selectHTML}
                    </select>

                    <textarea class="input text important setting" style="margin:10px;width:40%;pointer-events:all;text-align:left" placeholder="Enter FIRST Data Points" onchange="setData('${part._id}', 'FIRSTFields', this)" data-data="innerHTML">${firstFieldData}</textarea>

                </div>
                
                `;
                break;
            case "FIRST":
                partHTML = `
                <div class="flex_center" style="width:100%">
                    <span class="text small" style="margin: 5px 10px;text-align:left">Combine Individual Data Points</span>
                    <select value="${part.Data["Stat"]}" class="input text important setting" style="margin:10px;width:50%;pointer-events:all" onchange="setData('${part._id}', 'Stat', this)">
                        <option value="sum" ${part.Data["Stat"] == "sum" ? "selected": ""}>Sum Of...</option>
                        <option value="avg" ${part.Data["Stat"] == "avg" ? "selected": ""}>Average Of...</option>
                        <option value="max" ${part.Data["Stat"] == "max" ? "selected": ""}>Maximum Of...</option>
                        <option value="min" ${part.Data["Stat"] == "min" ? "selected": ""}>Minimum Of...</option>
                        <option value="range" ${part.Data["Stat"] == "range" ? "selected": ""}>Range Of...</option>
                    </select>
                </div>
                <div class="flex_center" style="width:100%">
                    <span class="text small" style="margin: 5px 10px;text-align:left">Data Point</span>
                    <select value="${part.Data["DataPoint"]}" class="input text important setting" style="margin:10px;width:50%;pointer-events:all" onchange="setData('${part._id}', 'DataPoint', this)">
                        <option value="score" ${part.Data["DataPoint"] == "score" ? "selected": ""}>Score</option>
                        <option value="penalties" ${part.Data["DataPoint"] == "penalties" ? "selected": ""}>Penalty Points</option>
                        <option value="rp" ${part.Data["DataPoint"] == "rp" ? "selected": ""}>Ranking Points</option>
                    </select>
                </div>
                
                `;
                break;
        }

        fHTML += `
        <div class="flex_center" style="width:100%;margin:10px">
            <div class="container level1bg" style="padding:20px;width:60%">
                <div class="flex_apart" style="width:100%">
                    <div style="width:40%">
                        <span class="text small" style="margin: 5px 10px;text-align:left">Item Name / Label</span>
                        <input class="input small" value="${part.Name}" style="display: inline-block;width:100%;" type="text" placeholder="A Number Point" onchange="setName('${part._id}', this)"/>
                    </div>
                    
                    <div class="flex_apart" style="width:10%;justify-content:right">
                        <div class="container primarybg clickable" style="padding: 10px;margin:5px;width:50px" onclick="moveItem('${part._id}', -1)">
                            <span class="text regular material-symbols-rounded">arrow_upward</span>
                        </div>
                        <div class="container primarybg clickable" style="padding: 10px;margin:5px;width:50px" onclick="moveItem('${part._id}', 1)">
                            <span class="text regular material-symbols-rounded">arrow_downward</span>
                        </div>
                        <div class="container redbg clickable" style="padding: 10px;margin:5px;width:50px" onclick="deleteItem('${part._id}')">
                            <span class="text regular material-symbols-rounded">close</span>
                        </div>
                    </div>
                </div>
                ${partHTML}
            </div>
        </div>
        
        
        `;
    
    });
    document.querySelector("#items").innerHTML = fHTML;

    currentAnalysisSet.Parts.filter(i => i.Type == "Custom").forEach(part => {
        custom_refreshDataPiece(part._id);
    });
}

refreshAnalysisSet();

function setName(item, elem){
    var index = currentAnalysisSet.Parts.indexOf(currentAnalysisSet.Parts.find(i => i._id == item));
    currentAnalysisSet.Parts[index].Name = elem.value;
    

}

function setData(item, dataPoint, elem){
    var index = currentAnalysisSet.Parts.indexOf(currentAnalysisSet.Parts.find(i => i._id == item));

    if(elem.dataset.data == "innerHTML"){
        currentAnalysisSet.Parts[index].Data[dataPoint] = elem.value.split("\n");
    }else if(elem.dataset.data == "multi"){
        var selectedOptions = elem.selectedOptions;
        currentAnalysisSet.Parts[index].Data[dataPoint] = Array.from(selectedOptions).map(({ value }) => value);;
    }else if(elem.dataset.data == "check"){
        currentAnalysisSet.Parts[index].Data[dataPoint] = elem.checked;
    }
    else{
        currentAnalysisSet.Parts[index].Data[dataPoint] = elem.value;
    }

    
    //refreshAnalysisSet();
}



var customLabelAvailableVariables = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
function custom_addDataPiece(partid){

    var index = currentAnalysisSet.Parts.indexOf(currentAnalysisSet.Parts.find(i => i._id == partid));

    if(currentAnalysisSet.Parts[index].Data.DataPieces.length >= 26){
        return;
    }

    var newPiece = {
        "Variable": customLabelAvailableVariables[currentAnalysisSet.Parts[index].Data.DataPieces.length],
        "Type": "Document (Value)",
        "DataPoint": ""
    }

    currentAnalysisSet.Parts[index].Data.DataPieces.push(newPiece);

    custom_refreshDataPiece(partid);


}

function custom_deleteDataPiece(partid, dataindex){

    var index = currentAnalysisSet.Parts.indexOf(currentAnalysisSet.Parts.find(i => i._id == partid));

    currentAnalysisSet.Parts[index].Data.DataPieces.splice(dataindex, 1);
    custom_refreshDataPiece(partid);
}

function custom_setDataPiece(partid, edit, dataindex, elem){
    var index = currentAnalysisSet.Parts.indexOf(currentAnalysisSet.Parts.find(i => i._id == partid));

    if(elem.dataset.data == "innerHTML"){
        currentAnalysisSet.Parts[index].Data.DataPieces[dataindex][edit] = elem.value.split("\n");
    }
    else if(elem.dataset.data == "multi"){
        var selectedOptions = elem.selectedOptions;
        currentAnalysisSet.Parts[index].Data.DataPieces[dataindex][edit] = Array.from(selectedOptions).map(({ value }) => value);;
    }
    else if(elem.dataset.data == "check"){
        currentAnalysisSet.Parts[index].Data.DataPieces[dataindex][edit] = elem.checked;
    }
    else{
        currentAnalysisSet.Parts[index].Data.DataPieces[dataindex][edit] = elem.value;
    }

    custom_refreshDataPiece(partid);

}

function custom_refreshDataPiece(partid){


    var index = currentAnalysisSet.Parts.indexOf(currentAnalysisSet.Parts.find(i => i._id == partid));

    var fHTML = "";
    currentAnalysisSet.Parts[index].Data.DataPieces.forEach((piece, i) => {
        if(piece.Type == "Document (Value)" || piece.Type == "Document (Points)"){
            var selectSelectHTML = "";
            schemaItems.forEach((item) => {
                    
                selectSelectHTML += `<option value="${item.part}---${item.component}" ${item.part + "---" + item.component == piece.DataPoint ? "selected" : ""}>${item.part} - ${item.component}</option>`
            });

            console.log(piece);
            fHTML += `
        
            <div class="container primarybg flex_apart" style="padding:10px;border-radius:8px;margin:4px">
                <span class="text small white" style="margin: 5px 10px;text-align:left">${piece.Variable}</span>

                <select class="input text important setting small" style="width:100%;pointer-events:all" data-data="select" onchange="custom_setDataPiece('${partid}', 'Type',${i}, this)">
                    <option value="Document (Value)" ${piece.Type == "Document (Value)" ? "selected": ""}>Document (Value)</option>
                    <option value="Document (Points)" ${piece.Type == "Document (Points)" ? "selected": ""}>Document (Points)</option>
                    <option value="FIRST" ${piece.Type == "FIRST" ? "selected": ""}>FIRST</option>
                </select>

                <select class="input text important setting small" style="width:100%;pointer-events:all" data-data="select" onchange="custom_setDataPiece('${partid}', 'DataPoint',${i}, this)">
                    ${selectSelectHTML}
                </select>

                <div class="container redbg clickable" style="padding: 10px;margin:5px;width:50px" onclick="custom_deleteDataPiece('${partid}', ${i})">
                    <span class="text regular material-symbols-rounded">close</span>
                </div>
            </div>
            
            `;
        }else{
            console.log(piece);
            fHTML += `
        
            <div class="container primarybg flex_apart" style="padding:10px;border-radius:8px;margin:4px">
                <span class="text small white" style="margin: 5px 10px;text-align:left">${piece.Variable}</span>

                <select class="input text important setting small" style="width:100%;pointer-events:all" data-data="select" onchange="custom_setDataPiece('${partid}', 'Type',${i}, this)">
                    <option value="Document (Value)" ${piece.Type == "Document (Value)" ? "selected": ""}>Document (Value)</option>
                    <option value="Document (Points)" ${piece.Type == "Document (Points)" ? "selected": ""}>Document (Points)</option>
                    <option value="FIRST" ${piece.Type == "FIRST" ? "selected": ""}>FIRST</option>
                </select>


                <input value="${piece.DataPoint}" class="input text important setting small" style="width:100%;pointer-events:all" data-data="value" onchange="custom_setDataPiece('${partid}', 'DataPoint',${i}, this)">

                <div class="container redbg clickable" style="padding: 10px;margin:5px;width:50px" onclick="custom_deleteDataPiece('${partid}', ${i})">
                    <span class="text regular material-symbols-rounded">close</span>
                </div>
            </div>
            
            `;
        }
        
    });

    document.querySelector(`.custom_data_pieces[data-id='${partid}']`).innerHTML = fHTML;

}


function moveItem(item, dir){
    try{
        var index = currentAnalysisSet.Parts.indexOf(currentAnalysisSet.Parts.find(i => i._id == item));
        if(index == 0 && dir == -1) return;
        if(index == currentAnalysisSet.Parts.length - 1 && dir == 1) return;
        var temp = currentAnalysisSet.Parts[index];
        currentAnalysisSet.Parts[index] = currentAnalysisSet.Parts[index + dir];
        currentAnalysisSet.Parts[index + dir] = temp;
        refreshAnalysisSet();

    }catch(e){
        console.log(e);
    }
}

function saveAnalysis(){
    var name = document.querySelector("#analysisName").value;
    currentAnalysisSet.Name = name;
    post("/api/analysis", {}, currentAnalysisSet, function(success,data){
        document.querySelector("#overlayContent").innerHTML = `
        <span class="text regular">Analysis Set Saved as ${name}</span>
        `
        document.querySelector("#overlay").style.display = "";
        document.querySelector("#overlayTitle").style.display = "Completed";
        document.querySelector("#overlayClose").style.display = "";
        document.querySelector("#overlayDone").style.display = "done";
    });
}
document.querySelector("#overlayClose").addEventListener("click", function(e){
    document.querySelector("#overlay").style.display = "none";
    document.querySelector("#overlayContent").innerHTML = "";
    document.querySelector("#overlayClose").style.display = "";
    document.querySelector("#overlayDone").style.display = "";
    overlaySaveData = {};
});

document.querySelector("#overlayDone").addEventListener("click", function(e){
    overlaySaveFunction();
    overlaySaveData = {};
});

function loadAnalysises(){
    get("/api/analysis/all", {}, function(success, data){
        console.log(success);
        if(success){
            document.querySelector("#overlayClose").style.display = "";
            document.querySelector("#overlayContent").innerHTML = `<div id="overlay_analysis" style="max-height:50vh;overflow-y:scroll"></div>`;

            var index = 0;
            data["analysis"].forEach(function(analysis){
                
                document.querySelector("#overlay_analysis").innerHTML += `
                <div class="container level2bg flex_apart clickable overlay_selectAnalysis" data-id="${analysis._id}" style="margin:5px">
                    <span class="text regular">${analysis.Name}</span>
                    <span class="text caption">${analysis.Schema.Name}</span>
                </div>
                    

                `;
                index++;
            });

            overlaySaveData["analysises"] = data["analysis"];
            overlaySaveData["currentAnalysis"] = undefined;

            overlaySaveFunction = ()=>{
                if(overlaySaveData["currentAnalysis"] != undefined){
                    var selectedAnalysis = overlaySaveData["analysises"].find(a => a._id == overlaySaveData["currentAnalysis"]);
                    currentAnalysisSet = selectedAnalysis;

                    document.querySelector("#analysisName").value = selectedAnalysis.Name;
                    var selectedSchema = schemas.find(s => s.Name == selectedAnalysis.Schema.Name);
                    document.querySelector("#analysisSchema").value = selectedSchema._id;
                    refreshAnalysisSet();
                    document.querySelector("#overlay").style.display = "none";
                }
            }

            Array.from(document.querySelectorAll(".overlay_selectAnalysis")).forEach(function(element){
                element.addEventListener("click", function(e){
                    var id = element.dataset.id;

                    if(overlaySaveData["currentAnalysis"] != undefined){
                        var oldElement = document.querySelector(`.overlay_selectAnalysis[data-id="${overlaySaveData["currentAnalysis"]}"]`);
                        oldElement.style.backgroundColor = "";
                    }

                    element.style.backgroundColor = "#680991";
                    overlaySaveData["currentAnalysis"] = id;
                });
            });

            document.querySelector("#overlayTitle").innerHTML = "Select Analysis Set";
            document.querySelector("#overlay").style.display = "";
        }
    });
}

function deleteItem(item){
    var index = currentAnalysisSet.Parts.indexOf(currentAnalysisSet.Parts.find(i => i._id == item));
    currentAnalysisSet.Parts.splice(index, 1);
    refreshAnalysisSet();
}

function addItem(itemType){
    var item = {
        Name: "",
        Type: itemType,
        Data: {},
        _id: Math.random().toString(36).substring(7)
    }

    switch(itemType){
        case "Number":
            item.Data = {
                "Stat_Final": "sum",
                "Stat_Between": "sum",
                "FIRSTFields": [],
                "SchemaFields": [],
                "UsePoints" : false,
                "UseOtherDocs": false
            }
            break;
        case "Grid":
            item.Data = {
                "Display": "heatmap",
                "SchemaFields": [],
                "UseOtherDocs": false
            }
            break;
        case "Frequency":
            item.Data = {
                "FIRSTFields": [],
                "SchemaFields": [],
                "UsePoints": false,
                "UseOtherDocs": false
            }
            break;
        case "Graph":
            item.Data = {
                "Stat_Between": "sum",
                "DocumentData": true,
                "FIRSTFields": [],
                "SchemaFields": [],
                "UsePoints": false
            }
            break;
        case "FIRST":
            item.Data = {
                "Stat": "sum",
                "DataPoint": "score"
            }
            break;
        case "Custom":
            item.Data = {
                "Code": [],
                "DataPieces": []
            }
    }

    currentAnalysisSet.Parts.push(item);
    refreshAnalysisSet();
}


