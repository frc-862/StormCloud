var environmentData = {};
var persistantData = {};
var overlaySaveData = {};
var overlaySaveFunction = ()=>{};
var settings = {};
var showingContent = false;
var schemas = [];
var analysises = [];




function generate_document_snip(d, extraclasses="", additionalcontent=""){
    var data = JSON.parse(d["json"]);
    var df = "";
    var datetime = new Date(d["datetime"]).toLocaleString();
    switch(data["type"]){
        case "paper":

            
            df += `
                <div class="container clickable document ${extraclasses}" style="width:180px;padding:15px 10px;margin:5px" data-team="${data["team"]}" data-id="${d["_id"]}" onclick="handle_document_click('${d["_id"]}')">
                    <div class="flex_apart" style="width:100%;pointer-events:none">
                        <span class="text regular material-symbols-rounded" style="width:20%;color:${d["flagged"] == undefined || d["flagged"] == false ? "white" : "yellow"}">edit_document</span>
                        <div style="width:80%">
                            <span class="text caption" style="font-weight:600;color:${d["flagged"] == undefined || d["flagged"] == false ? "white" : "yellow"}">${d["name"] == undefined || d["name"] == "" ? `Team ${data["team"]}, Match ${data["match"]}` : d["name"]}</span>
                            <span class="text tiny" style="color:${d["flagged"] == undefined || d["flagged"] == false ? "white" : "yellow"}">${d["name"] == undefined || d["name"] == "" ? datetime : `Team ${data["team"]}, Match ${data["match"]}`}</span>
                        </div>
                        ${additionalcontent}
                    </div>
                </div>
            `
            break;
        case "photo":

            
            df += `
                <div class="container clickable document ${extraclasses}" style="width:180px;padding:15px 10px;margin:5px" data-team="${data["team"]}" data-id="${d["_id"]}" onclick="handle_document_click('${d["_id"]}')">
                    <div class="flex_apart" style="width:100%;pointer-events:none">
                        <span class="text regular material-symbols-rounded" style="width:20%;color:${d["flagged"] == undefined || d["flagged"] == false ? "white" : "yellow"}">camera</span>
                        <div style="width:80%">
                            <span class="text caption" style="font-weight:600;color:${d["flagged"] == undefined || d["flagged"] == false ? "white" : "yellow"}">${d["name"] == undefined || d["name"] == "" ? `Team ${data["team"]}, Match ${data["match"]}` : d["name"]}</span>
                            <span class="text tiny" style="color:${d["flagged"] == undefined || d["flagged"] == false ? "white" : "yellow"}">${d["name"] == undefined || d["name"] == "" ? datetime : `Team ${data["team"]}, Match ${data["match"]}`}</span>
                        </div>
                        ${additionalcontent}
                    </div>
                </div>
            `
            break;
        case "tablet":
            var completed = data["completed"];
            if(completed == undefined){
                completed = false;
            }
            df += `
                <div class="container clickable document ${extraclasses}" style="width:180px;padding:15px 10px;margin:5px" data-team="${data["team"]}" data-id="${d["_id"]}" onclick="handle_document_click('${d["_id"]}')">
                    <div class="flex_apart" style="width:100%;pointer-events:none">
                        <span class="text regular material-symbols-rounded" style="width:20%;color:${d["flagged"] == undefined || d["flagged"] == false ? "white" : "yellow"}">bar_chart</span>
                        <div style="width:80%">
                            <span class="text caption" style="font-weight:600;color:${d["flagged"] == undefined || d["flagged"] == false ? "white" : "yellow"}">${d["name"] == undefined || d["name"] == "" ? `Team ${data["team"]}, Match ${data["match"]}` : d["name"]}</span>
                            <span class="text tiny" style="color:${d["flagged"] == undefined || d["flagged"] == false ? "white" : "yellow"}">${d["name"] == undefined || d["name"] == "" ? `${completed ? `OK at ${datetime}` : "Not Complete"}` : `Team ${data["team"]}, Match ${data["match"]}`}</span>
                        </div>
                        ${additionalcontent}
                    </div>
                </div>
            `
            break;
        case "note":
            
            var teamConcerned = data["team"];
            var author = data["author"];

            df += `
                <div class="container clickable document ${extraclasses}" style="width:180px;padding:15px 10px;margin:5px" data-team="${data["team"]}" data-id="${d["_id"]}" onclick="handle_document_click('${d["_id"]}')">
                    <div class="flex_apart" style="width:100%;pointer-events:none">
                        <span class="text regular material-symbols-rounded" style="width:20%;color:${d["flagged"] == undefined || d["flagged"] == false ? "white" : "yellow"}">format_quote</span>
                        <div style="width:80%">
                            <span class="text caption" style="font-weight:600;color:${d["flagged"] == undefined || d["flagged"] == false ? "white" : "yellow"}">${d["name"] == undefined || d["name"] == "" ? `${teamConcerned == undefined || teamConcerned == "" ? "Match Note": "Note on " + teamConcerned}` : d["name"]}</span>
                            <span class="text tiny" style="color:${d["flagged"] == undefined || d["flagged"] == false ? "white" : "yellow"}">${d["name"] == undefined || d["name"] == "" ? `By ${data["author"] == undefined ? "Anonymous" : data["author"]}` : `${teamConcerned == undefined || teamConcerned == "" ? "Match Note": "Note on " + teamConcerned}`}</span>
                        </div>
                        ${additionalcontent}
                    </div>
                </div>
            `
    }
    return df;
}


function readFromCookie(name){
    var result = document.cookie.match(new RegExp(name + '=([^;]+)'));
    result && (result = result[1]);
    return result;
}

function writeToCookie(name, value){
    

    document.cookie = name + "=" + value;

}


function try_show_content(){
    if(showingContent == false){
        showingContent = true;
        document.querySelector("#contents").style.display = "";
        document.querySelector("#waiting").style.display = "none";
    }
}

function show_settings(){

    document.querySelector(".setting[data-setting='selectedSchema']").innerHTML = "";
    schemas.forEach((i) => {
        document.querySelector(".setting[data-setting='selectedSchema']").innerHTML += `<option value="${i["Name"]}">${i["Name"]}</option>`
    });

    document.querySelector(".setting[data-setting='defaultAnalysis']").innerHTML = "";
    analysises.forEach((i) => {
       document.querySelector(".setting[data-setting='defaultAnalysis']").innerHTML += `<option value="${i["Name"]}">${i["Name"]}</option>` 
    });


    Object.keys(settings).forEach((name) => {
        var value = settings[name];
        var element = document.querySelector(`.setting[data-setting="${name}"]`);
        if(element != null && element != undefined){
            if(element.dataset.type == "input"){
                element.value = value;
            }
            element.value = value;
        }
            
        
    });
}


function pull_environment(){
    get("/api/environment", {}, function(success, data){
        if(success){

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
            
            get("/api/analysis/all", {} , function(success, data){
                analysises = data["analysis"];
                show_settings();
            });

            show_settings();
            try_show_content();
            handle_environment(environmentData);
            analysis_update_schema();
        }
    })

    // also need to get known teams
    get("/api/teams", {}, function(success, data){
        if(success){
            persistantData["knownTeams"] = data;
        }
        
    });
}

document.addEventListener('DOMContentLoaded', function(){
    
    pull_environment();
    
});





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

function remove(link, headers, data, callback){
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

function put(link, headers, data, callback){
    $.ajax({
        url: link,
        type: "PUT",
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

function settingChange(element){
    
    settings[element.dataset.setting] = element.value;
    if(element.dataset.setting == "selectedSchema"){
        analysis_update_schema();
    }
    post("/api/setting", {}, {key: element.dataset.setting, value: element.value}, function(success, data){

    });
}


function tryRequestAPI(button, link){
    if(button.opacity == 0.5){
        return;
    }
    
    Array.from(document.getElementsByClassName("firstSyncOption")).forEach((item)=>{
        item.disabled = true;
        item.classList = "level1bg container firstSyncOption";
        item.style.cursor = "not-allowed";
        item.opacity = 0.5;
    });
    button.classList = "primarybg container firstSyncOption";

    var year = settings["competitionYear"];
    var competition = settings["competitionCode"];
    var matchType = "Qualification";

    get(link + `?competition=${competition}&year=${year}&matchType=${matchType}`, {}, function(success, data){
        Array.from(document.getElementsByClassName("firstSyncOption")).forEach((item)=>{
            item.disabled = false;
            item.classList = "level1bg container clickable firstSyncOption";
            item.style.cursor = "";
            item.opacity = 1;
        });
    });
}


Array.from(document.getElementsByClassName("clickable")).forEach((item)=>{
    item.addEventListener("click", function(e){
        if(e.srcElement.dataset.triggers == undefined){
            return;
        }
        var triggers = e.srcElement.dataset.triggers.split(" ");
        triggers.forEach((trigger)=>{
            try{
                document.querySelector(`[data-part="${trigger}"]`).style.display = "";
            }catch(e){

            }
            
        })
        
        
        if(e.srcElement.dataset.link){
            window.location.href = e.srcElement.dataset.link;
        }
    })
    item.addEventListener("focusout", function(e){
        if(e.srcElement.dataset.triggers == undefined){
            return;
        }
        var triggers = e.srcElement.dataset.triggers.split(" ");
        triggers.forEach((trigger)=>{
            try{
                document.querySelector(`[data-part="${trigger}"]`).style.display = "none";
            }catch(e){
                
            }
        })
    })
    item.addEventListener("mouseenter", function(e){
        if(e.srcElement.dataset.triggers == undefined){
            return;
        }
        var triggers = e.srcElement.dataset.triggers.split(" ");
        if(e.srcElement.dataset.hover){
            triggers.forEach((trigger)=>{
                try{
                    document.querySelector(`[data-part="${trigger}"]`).style.display = "";
                }catch(e){
                    
                }
            })
        }
    })
    item.addEventListener("mouseleave", function(e){
        if(e.srcElement.dataset.triggers == undefined){
            return;
        }
        var triggers = e.srcElement.dataset.triggers.split(" ");
        if(!e.srcElement.dataset.persist){
            triggers.forEach((trigger)=>{
                try{
                    document.querySelector(`[data-part="${trigger}"]`).style.display = "none";
                }catch(e){
                    
                }
            })
        }
    })
})

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


var matches = [];

/*
    Differently Defined API Actions
*/

function pull_matches(cb=()=>{}){
    get("/api/matches", {}, function(success,data){
        cb(data["matches"], data["allDocuments"]);
    })
}

function pull_teams(cb=()=>{}){
    get("/api/teams", {}, function(success,data){
        cb(data["teams"]);
    })
}


/*
    Handle Different API Actions
*/

function handle_environment(env){
    document.querySelector("#role_list").innerHTML = "";
    var f = "";

    env["access"].forEach((r)=>{
        f += `
        <div class="container level1bg clickable" style="width:100%;margin: 10px 0px" data-id="${r["_id"]}">
            <span class="text caption" style="text-align: left">${r["role"]}</span>
        </div>`
    });

    console.log("TESTING");
    
    document.querySelector("#role_list").innerHTML = f;
}

function handle_matches(ms){
    document.querySelector('#match_list').innerHTML = "";
    var f = "";

    ms.sort((a,b)=>{
        return a["matchNumber"] - b["matchNumber"];
    })
    var analysisMatchDD = "";
    ms.forEach((m)=>{
        
        var tf = "";

        

        f += `
        <div class="container level1bg clickable selectMatch" style="width:80%;margin: 10px 10px" data-id="${m["_id"]}">
            <span class="text caption" style="text-align: left">Match ${m["matchNumber"]} ${m["results"]["finished"] ? "(Done)" : ""}</span>
            <span class="text small" style="text-align: left">${m["documents"].length} Document${m["documents"].length != 1 ? "s" : ""}</span>
            
        </div>`
        analysisMatchDD += `<option value="${m["_id"]}">Match ${m["matchNumber"]}</option>`


    });
    document.querySelector("#analysis_matches").innerHTML = analysisMatchDD;
    document.querySelector('#match_list').innerHTML = f;


    Array.from(document.querySelectorAll('.selectMatch')).forEach((i) => {
        i.addEventListener('click', function(e){
            handle_match_click(e.srcElement.dataset.id);
        })
    });

    // teams are automatically assumed to be the teams in the matches. This is not always the case, so we need to check against the known teams as well.

    

    handle_assumedteams(ms);

}

function handle_assumedteams(ms){

    var teams = [];
    ms.forEach((m)=>{
        m["teams"].forEach((t)=>{
            if(!teams.includes(t["team"])){
                teams.push(t["team"]);
            }
        })
    });

    // from database
    persistantData["knownTeams"].forEach((t)=>{
        if(!teams.includes(t["teamNumber"])){
            teams.push(t["teamNumber"]);
        }
    });

    // from all of the documents
    persistantData["allDocuments"].forEach((d)=>{
        try{
            let obj = JSON.parse(d["json"]);
            if(obj["team"] != undefined && !teams.includes(parseInt(obj["team"]))){
                teams.push(parseInt(obj["team"]));
            }
        }catch(e){

        }
    });

    document.querySelector('#team_view_container').style.display = "none";
    document.querySelector('#team_list').innerHTML = "";

    var f = "";


    persistantData["teams"] = [];

    // persistentData["knownTeams"] stores all of the known team identities. Check against this list when interpreting the teams.
    // sort by team number
    teams.sort((a,b)=>a-b);
    var analysisTeamDD = "";
    teams.forEach((t)=>{
        if(t == undefined){
            return;
        }
        var knownTeam = persistantData["knownTeams"].find((kt)=>kt["teamNumber"] == t);
        var teamObj = {
            "number": t,
            "documents": persistantData["allDocuments"].filter((d)=>{
                try{
                    let obj = JSON.parse(d["json"]);
                    return obj["team"] == t;
                }
                catch(e){
                    return false;
                }
            })
        };
        f += `
            <div class="container level1bg clickable selectTeam" style="width:80%;margin: 10px 10px" data-id="${t}">
                <span class="text caption" style="text-align: left">Team ${t}</span>
                <span class="text small" style="text-align: left">${teamObj["documents"].length} Documents${knownTeam == undefined ? " (Unknown)" : ""}</span>
                
            </div>
        `;
        analysisTeamDD += `<option value="${t}">Team ${t}</option>`

        persistantData["teams"].push(teamObj);
    });

    document.querySelector("#analysis_teams").innerHTML = analysisTeamDD;

    document.querySelector('#team_list').innerHTML = f;
    Array.from(document.querySelectorAll('.selectTeam')).forEach((i) => {
        i.addEventListener('click', function(e){
            handle_team_click(e.srcElement.dataset.id);
        })
    });
}



var selected_filter_documents = [];
function toggle_filter_selection(e){
    e.stopPropagation();
    var element = e.srcElement;
    var id = element.dataset.id;
    if(selected_filter_documents.includes(id)){
        selected_filter_documents = selected_filter_documents.filter((i)=>i != id);
        element.style.backgroundColor = "";
        document.querySelector(`.filter_document[data-id="${id}"]`).style.border = "";
        element.style.borderRadius = "4px";
        if(selected_filter_documents.length == 0){
            document.querySelector("#filter_bulkActions").style.display = "none";
        }
    }
    else{
        selected_filter_documents.push(id);
        element.style.backgroundColor = "#680991";
        document.querySelector(`.filter_document[data-id="${id}"]`).style.border = "2px solid #680991";
        element.style.borderRadius = "10px";
        document.querySelector("#filter_bulkActions").style.display = "";
    }
}

function refresh_filter_documents(){
    // get conditions to filter by
    var team = document.querySelector("#filter_team").value;
    var type = document.querySelector("#filter_type").value;
    var match = document.querySelector("#filter_match").value;

    persistantData["allDocuments"].forEach((d)=>{
        var data = JSON.parse(d["json"]);
        var display = true;
        if(team != "" && data["team"] != team){
            display = false;
        }
        else if(type != "any" && type != "" && data["type"] != type){
            display = false;
        }
        else if(match != ""){
            // match is a bit different
            if(data["type"] == "tablet" || data["type"] == "note"){
                if(data["match"] != match){
                    display = false;
                }
            }
            else{
                if(!data["matches"].includes(match)){
                    display = false;
                }
            }
        }

        document.querySelector(`.filter_document[data-id="${d["_id"]}"]`).style.display = display ? "" : "none";


    });
}

function flag_selected_documents(){
    selected_filter_documents.forEach((id)=>{
        if(persistantData["allDocuments"].find((d)=>d["_id"] == id)["flagged"] == undefined){
            persistantData["allDocuments"].find((d)=>d["_id"] == id)["flagged"] = true;
        }else{
            persistantData["allDocuments"].find((d)=>d["_id"] == id)["flagged"] = !persistantData["allDocuments"].find((d)=>d["_id"] == id)["flagged"];
        }

        put("/api/document", {}, {docId: id, flagged: persistantData["allDocuments"].find((d)=>d["_id"] == id)["flagged"]}, (success, data) => {
        
        });
        
    });
    selected_filter_documents = [];
    document.querySelector("#filter_bulkActions").style.display = "none";
    handle_filter_documents(persistantData["allDocuments"]);
    refresh_filter_documents();
    
}

function delete_selected_documents(elem){


    if(elem.dataset.confirm == "false"){
        elem.dataset.time = (new Date()).toString();
        elem.innerHTML = `<span class="text caption">Are You Sure?</span>`;
        elem.classList = "container redbg clickable";
        elem.dataset.confirm = "true";
    }else{
        if(elem.dataset.time == undefined){
            elem.innerHTML = `<span class="text caption">Delete All</span>`;
            elem.classList = "container level2bg clickable";
            elem.dataset.confirm = "false";
        }
        if(new Date() - new Date(elem.dataset.time) > 1500){
            elem.innerHTML = `<span class="text caption">Delete All</span>`;
            elem.classList = "container level2bg clickable";
            elem.dataset.confirm = "false";
            return;
        }
        elem.innerHTML = `<span class="text caption">Deleting...</span>`;
        elem.classList = "container redbg clickable";
        elem.dataset.confirm = "false";

        


        var selected = selected_filter_documents;
        selected.forEach((id)=>{
            remove("/api/document", {}, {docId: id}, (success, data) => {
            
            });
    
            persistantData["allDocuments"] = persistantData["allDocuments"].filter((d)=>d["_id"] != id);
        });
        selected_filter_documents = [];
        document.querySelector("#filter_bulkActions").style.display = "none";
        
        refresh_filter_documents();
        handle_filter_documents(persistantData["allDocuments"]);



        elem.innerHTML = `<span class="text caption">Delete All</span>`;
        elem.classList = "container level2bg clickable";
        elem.dataset.confirm = "false";


        
    }







    
}

function handle_filter_documents(docs){
    var fHTML = "";
    docs.forEach((d)=>{


        fHTML += generate_document_snip(d, "filter_document level1bg",`
            <div class="level2bg clickable filter_document_selectionBox" style="border-radius:4px;width:24px;height:20px;pointer-events:all" data-id="${d["_id"]}" onclick="toggle_filter_selection(event)">

            </div>
        `);
    });

    
    document.querySelector('#filter_view_documents').innerHTML = fHTML;

}


/*
    Handle Different Interations
*/


var activeItem = undefined;

var currentMatch = undefined;
var currentTeam = undefined;
var currentTeamsFiltered = [];
var cachedDocuments = [];
var unassignedDocuments = [];

var currentRole = undefined;
var cachedRoleSettings = [];

function handle_role_click(id="NEW"){

    if(currentRole != undefined){
        if(currentRole == "NEW"){
            document.querySelector("#role_add").classList = "container level1bg clickable";
            // cachedRoleSettings["NEW"] = {
            //     "role": document.querySelector("#role_name").value
            // }
        }else{
            document.querySelector(".role[data-id='" + currentRole["_id"] + "']").classList = "container level1bg clickable";
            // cachedRoleSettings[currentRole["_id"]] = {
            //     "role": document.querySelector("#role_name").value
            // }
        }
    }

    
    if(id == "NEW"){
        currentRole = "NEW";
        document.querySelector("#role_view_name").value = "";
        document.querySelector("#role_add").classList = "container primarybg clickable";
    }else{
        currentRole = environmentData["access"].find((r)=>r["_id"] == id);
        document.querySelector("#role_view_name").value = currentRole["role"];
        document.querySelector(".role[data-id='" + id + "']").classList = "container primarybg clickable";
    }

    document.querySelector("#role_view_container").style.display = "";
}

document.querySelector("#role_add").addEventListener("click", function(e){
    handle_role_click("NEW");
});

document.querySelector("#role_view_close").addEventListener("click", function(e){
    if(currentRole != undefined){
        if(currentRole == "NEW"){
            document.querySelector("#role_add").classList = "container level1bg clickable";
            // cachedRoleSettings["NEW"] = {
            //     "role": document.querySelector("#role_name").value
            // }
        }else{
            document.querySelector(".role[data-id='" + currentRole["_id"] + "']").classList = "container level1bg clickable";
            // cachedRoleSettings[currentRole["_id"]] = {
            //     "role": document.querySelector("#role_name").value
            // }
        }
    }
    document.querySelector("#role_view_container").style.display = "none";
});


function show_hide_documents(){
    var thisMatchTeamFilters = currentTeamsFiltered.filter((i) => i["match"] == currentMatch["_id"]);
    var shown = 0;
    Array.from(document.querySelectorAll(".document")).forEach((i) => {
        if(thisMatchTeamFilters.length == 0){
            i.style.display = "";
            shown+=1;
            return;
        }

        if(i.dataset.team == undefined || i.dataset.team == ""){
            i.style.display = "none";
            return;
        }

        

        if(thisMatchTeamFilters.filter((j) => j["team"] == i.dataset.team).length > 0){
            i.style.display = "";
            shown+=1;
            return;
        }

        i.style.display = "none";



    })
    try{
        if(shown == 0){
            document.querySelector("#match_view_emptyMessage").style.display = "";
        }else{
            document.querySelector("#match_view_emptyMessage").style.display = "none";
        }
    }catch(e){

    }
    
}

function handle_document_click(id){
    
    var d = persistantData["allDocuments"].filter((i) => i["_id"] == id)[0];
    overlaySaveData["document"] = id;
    
    var data = JSON.parse(d["json"]);
    var datetime = new Date(d["datetime"]);
    datetime = datetime.toLocaleString();
    document.querySelector("#overlayClose").style.display = "none";
    document.querySelector("#overlayContent").innerHTML = ``;
    switch(data["type"]){
        case "paper":
            var teamNumber = data["team"];
            var matches = data["matches"] | [];
            document.querySelector("#overlayContent").innerHTML = `
            <input type="text" class="input" placeholder="Document Name (Optional)" id="overlayContent_Name" value="${d["name"] == undefined ? "" : d["name"]}">
            <div class="flex_center">
                <img src="${data["path"]}.png" style="max-height:40vh;border-radius:8px"/>
            </div>

            <div class="flex_center">
                <div class="flex_center level2bg" style="margin:10px;border-radius:10px;padding:10px">
                    <input type="checkbox" id="overlayContent_Flagged" ${d["flagged"] == undefined || d["flagged"] == false ? "" : "checked"}>
                    <span class="text small" style="margin-left:10px">Flagged</span>
                </div>
            
            </div>

            <div class="flex_center" style="margin:10px">
                    <div class="container level2bg clickable" id="overlayContent_deleteDocument" style="padding:10px">
                        <span class="text caption">Delete Document</span>
                    </div>
                </div>
            
            `;
            overlaySaveFunction = () => {
                var name = document.querySelector("#overlayContent_Name").value;
                var flagged = document.querySelector("#overlayContent_Flagged").checked;
                put("/api/document", {}, {name: name, docId: d["_id"], flagged: flagged}, (success, data) => {
                    if(activeItem["number"] == undefined){
                        handle_match_click(currentMatch["_id"]);
                    }else{
                        handle_team_click(currentTeam["number"]);
                    }
                });
                document.querySelector("#overlay").style.display = "none";
            }
            document.querySelector("#overlayContent_deleteDocument").addEventListener("click", function(e){
                if(!overlaySaveData["deleteConfirm"]){
                    overlaySaveData["deleteTime"] = new Date();
                    document.querySelector("#overlayContent_deleteDocument").innerHTML = `<span class="text caption">Are You Sure?</span>`;
                    document.querySelector("#overlayContent_deleteDocument").classList = "container redbg clickable";
                    overlaySaveData["deleteConfirm"] = true;
                }else{
                    if(overlaySaveData["deleteTime"] == undefined){
                        document.querySelector("#overlayContent_deleteDocument").innerHTML = `<span class="text caption">Delete Document</span>`;
                        document.querySelector("#overlayContent_deleteDocument").classList = "container level2bg clickable";
                        overlaySaveData["deleteConfirm"] = false;
                    }
                    if(new Date() - overlaySaveData["deleteTime"] > 1500){
                        document.querySelector("#overlayContent_deleteDocument").innerHTML = `<span class="text caption">Delete Document</span>`;
                        document.querySelector("#overlayContent_deleteDocument").classList = "container level2bg clickable";
                        overlaySaveData["deleteConfirm"] = false;
                        return;
                    }
                    document.querySelector("#overlayContent_deleteDocument").innerHTML = `<span class="text caption">Deleting...</span>`;
                    document.querySelector("#overlayContent_deleteDocument").classList = "container redbg clickable";
                    overlaySaveData["deleteConfirm"] = false;

                    remove("/api/document", {}, {docId: overlaySaveData["document"]}, (success, data) => {
                        if(success){
                            document.querySelector("#overlayContent_deleteDocument").innerHTML = `<span class="text caption">Deleted</span>`;
                            document.querySelector("#overlayContent_deleteDocument").classList = "container redbg clickable";
                            activeItem["documents"].splice(activeItem["documents"].indexOf(d => d._id == overlaySaveData["document"]), 1);
                            if(activeItem["number"] == undefined){
                                handle_match_click(currentMatch["_id"]);
                            }else{
                                handle_team_click(currentTeam["number"]);
                            }
                            
                            setTimeout(function(){
                                document.querySelector("#overlayClose").click();
                            }, 500);
                        }else{
                            document.querySelector("#overlayContent_deleteDocument").innerHTML = `<span class="text caption">Delete Document</span>`;
                            document.querySelector("#overlayContent_deleteDocument").classList = "container level2bg clickable";
                            overlaySaveData["deleteConfirm"] = false;
                        }
                    });
                    
                }
            });
            var matchesText = matches.length > 0 ? "- Matches " : "";
            if(matches != undefined && matches.length > 0){
                matches.forEach((i) => {
                    matchesText += i + " ";
                });
            }
            
            document.querySelector("#overlayTitle").innerHTML = `Paper Document - Team ${teamNumber}${matchesText}`;
            break;
        case "photo":
                var teamNumber = data["team"]
                var matches = data["matches"] | [];
                document.querySelector("#overlayContent").innerHTML = `
                <input type="text" class="input" placeholder="Document Name (Optional)" id="overlayContent_Name" value="${d["name"] == undefined ? "" : d["name"]}">
                <div class="flex_center">
                    <img src="${data["path"]}.png" style="max-height:40vh;border-radius:8px"/>
                </div>

                <div class="flex_center">
                <div class="flex_center level2bg" style="margin:10px;border-radius:10px;padding:10px">
                    <input type="checkbox" id="overlayContent_Flagged" ${d["flagged"] == undefined || d["flagged"] == false ? "" : "checked"}>
                    <span class="text small" style="margin-left:10px">Flagged</span>
                </div>
            
            </div>

                <div class="flex_center" style="margin:10px">
                        <div class="container level2bg clickable" id="overlayContent_deleteDocument" style="padding:10px">
                            <span class="text caption">Delete Document</span>
                        </div>
                    </div>
                
                `;

                overlaySaveFunction = () => {
                    var name = document.querySelector("#overlayContent_Name").value;
                    var flagged = document.querySelector("#overlayContent_Flagged").checked;
                    put("/api/document", {}, {name: name, docId: d["_id"], flagged: flagged}, (success, data) => {
                        if(activeItem["number"] == undefined){
                            handle_match_click(currentMatch["_id"]);
                        }else{
                            handle_team_click(currentTeam["number"]);
                        }
                    });
                    document.querySelector("#overlay").style.display = "none";
                }

                document.querySelector("#overlayContent_deleteDocument").addEventListener("click", function(e){
                    if(!overlaySaveData["deleteConfirm"]){
                        overlaySaveData["deleteTime"] = new Date();
                        document.querySelector("#overlayContent_deleteDocument").innerHTML = `<span class="text caption">Are You Sure?</span>`;
                        document.querySelector("#overlayContent_deleteDocument").classList = "container redbg clickable";
                        overlaySaveData["deleteConfirm"] = true;
                    }else{
                        if(overlaySaveData["deleteTime"] == undefined){
                            document.querySelector("#overlayContent_deleteDocument").innerHTML = `<span class="text caption">Delete Document</span>`;
                            document.querySelector("#overlayContent_deleteDocument").classList = "container level2bg clickable";
                            overlaySaveData["deleteConfirm"] = false;
                        }
                        if(new Date() - overlaySaveData["deleteTime"] > 1500){
                            document.querySelector("#overlayContent_deleteDocument").innerHTML = `<span class="text caption">Delete Document</span>`;
                            document.querySelector("#overlayContent_deleteDocument").classList = "container level2bg clickable";
                            overlaySaveData["deleteConfirm"] = false;
                            return;
                        }
                        document.querySelector("#overlayContent_deleteDocument").innerHTML = `<span class="text caption">Deleting...</span>`;
                        document.querySelector("#overlayContent_deleteDocument").classList = "container redbg clickable";
                        overlaySaveData["deleteConfirm"] = false;
    
                        remove("/api/document", {}, {docId: overlaySaveData["document"]}, (success, data) => {
                            if(success){
                                document.querySelector("#overlayContent_deleteDocument").innerHTML = `<span class="text caption">Deleted</span>`;
                                document.querySelector("#overlayContent_deleteDocument").classList = "container redbg clickable";
                                activeItem["documents"].splice(activeItem["documents"].indexOf(d => d._id == overlaySaveData["document"]), 1);
                                if(activeItem["number"] == undefined){
                                    handle_match_click(currentMatch["_id"]);
                                }else{
                                    handle_team_click(currentTeam["number"]);
                                }
                                setTimeout(function(){
                                    document.querySelector("#overlayClose").click();
                                }, 500);
                            }else{
                                document.querySelector("#overlayContent_deleteDocument").innerHTML = `<span class="text caption">Delete Document</span>`;
                                document.querySelector("#overlayContent_deleteDocument").classList = "container level2bg clickable";
                                overlaySaveData["deleteConfirm"] = false;
                            }
                        });
                        
                    }
                });
                var matchesText = matches.length > 0 ? "- Matches " : "";
                if(matches != undefined && matches.length > 0){
                    matches.forEach((i) => {
                        matchesText += i + " ";
                    });
                }
                document.querySelector("#overlayTitle").innerHTML = `Photo Document - Team ${teamNumber}${matchesText}`;
                break;
        case "tablet":
            var teamNumber = data["team"]
            var schema = schemas.find(s => s.Name == data["schema"]);
            var match = data["match"];
            try{
                if(schema == undefined){
                    document.querySelector("#overlayContent").innerHTML = `
                    <input type="text" class="input" placeholder="Document Name (Optional)" id="overlayContent_Name" value="${d["name"] == undefined ? "" : d["name"]}">
                    <span class="textslim"><i>Sorry, we couldn't find a schema...</i></span>

                    <div class="flex_center">
                <div class="flex_center level2bg" style="margin:10px;border-radius:10px;padding:10px">
                    <input type="checkbox" id="overlayContent_Flagged" ${d["flagged"] == undefined || d["flagged"] == false ? "" : "checked"}>
                    <span class="text small" style="margin-left:10px">Flagged</span>
                </div>
            
            </div>

                    <div class="flex_center" style="margin:10px">
                        <div class="container level2bg clickable" id="overlayContent_deleteDocument" style="padding:10px">
                            <span class="text caption">Delete Document</span>
                        </div>
                    </div>
                    `;
                }else{
                    var f = "";
                    var n = 0;
                    var formData = JSON.parse(data["data"]);
                    try{
    
                        schema.Parts.forEach(p => {
                            f += `
                            <div class="flex_center" style="margin:10px;margin-top:20px">
                                <span class="text regular" style="margin:5px;display:inline-block">${p.Name}  <span class="caption highlightedtext level2bg" style="width:50px;font-size:16px">${p.Time}s</span></span>
                                
                            </div>
                            <div class="flex_apart" style="margin:5px">
                                <span class="text small" style="margin:5px;display:inline-block;width:50%">Robot Disabled (in seconds)</span>
                                <input disabled type="number" class="input text small" style="pointer-events: all;width:50%" value="${data["disabled"] == undefined ? "Unknown" : data["disabled"] + "s"}"/>
                            </div>
                            `;
        
                            p.Components.forEach(c => {
        
                                switch(c.Type){
                                    case "Step":
                                        f += `
                                        <div class="flex_apart" style="margin:5px">
                                            <span class="text small" style="margin:5px;display:inline-block;width:50%">${c.Name}</span>
                                            <input disabled type="number" class="input text small" style="pointer-events: all;width:50%" value="${formData[n]}"/>
                                        </div>
                                        `;
                                        break;
                                    case "Check":
                                        f += `
                                        <div class="flex_apart" style="margin:5px">
                                            <span class="text small" style="margin:5px;display:inline-block;width:50%">${c.Name}</span>
                                            <div class="flex_center" style="width:50%">
                                                <div class="container ${c.Off == formData[n] ? "primarybg" : "level2bg"} clickable" style="padding:10px;margin:0px 5px;width:40%">
                                                    <span class="text caption">${c.Off}</span>
                                                </div>
                                                <div class="container ${c.On == formData[n] ? "primarybg" : "level2bg"} clickable" style="padding:10px;margin:0px 5px;width:40%">
                                                    <span class="text caption">${c.On}</span>
                                                </div>
                                            </div>
                                            
                                        </div>
                                        `;
                                        break;
                                    case "Select":
        
                                        var options = "";
                                        c.Options.forEach(o => {
                                            options += `
                                            <option value="${o}" ${o == formData[n] ? "selected" : ""}>${o}</option>
                                            `;
                                        });
        
                                        f += `
                                        <div class="flex_apart" style="margin:5px">
                                            <span class="text small" style="margin:5px;display:inline-block;width:50%">${c.Name}</span>
                                            <select disabled class="input text small" style="pointer-events: all;width:50%">${options}</select>
                                            
                                        </div>
                                        `;
                                        break;
                                    case "Event":
        
                                        var events = formData[n].split(";");
                                        var eventDivs = "";
                                        events.forEach(e => {
                                            eventDivs += `
                                                <div class="container level2bg" style="margin:2px;padding:4px 6px">
                                                    <span class="text small">${Math.round(parseInt(e))}s</span>
                                                </div>
                                                `;
                                        });
        
                                        f += `
                                        <div class="flex_apart" style="margin:5px">
                                            <span class="text small" style="margin:5px;display:inline-block;width:50%">${c.Name}</span>
                                            <div class="flex_center" style="width:50%">
                                                ${eventDivs}
                                            </div>
                                            
                                        </div>
                                        `;
                                        break;
                                    case "Timer":
                                        f += `
                                        <div class="flex_apart" style="margin:5px">
                                            <span class="text small" style="margin:5px;display:inline-block;width:50%">${c.Name} (in seconds)</span>
                                            <input disabled type="number" class="input text small" style="pointer-events: all;width:50%" value="${parseInt(formData[n])}"/>
                                        </div>
                                        `;
                                        break;
                                    case "Grid":

                                        var rows = formData[n].split("*");
                                        var gridHTML = "";
                                        rows.forEach(r => {
                                            var cols = r.split(",");
                                            var rowHTML = "";
                                            cols.forEach(c => {
                                                rowHTML += `
                                                
                                                <div class="container ${parseInt(c) == n ? "primarybg" : "level2bg"}" style="margin:2px;width:12px;height:12px;border-radius:4px">

                                                </div>
                                                
                                                `
                                            });
                                            gridHTML += `
                                                <div class="flex_center">
                                                    ${rowHTML}
                                                </div>
                                            `;
                                        });

                                        f += `
                                        <div class="flex_apart" style="margin:5px">
                                            <span class="text small" style="margin:5px;display:inline-block;width:50%">${c.Name}</span>
                                            <div>
                                                ${gridHTML}
                                            </div>
                                            
                                        </div>
                                        `;
                                        break;
                                }
                                if(c.Type != "Label"){
                                    n += 1;
                                }
                                
                            });
        
                        })
        
                        document.querySelector("#overlayContent").innerHTML = `
                        <input type="text" class="input" placeholder="Document Name (Optional)" id="overlayContent_Name" value="${d["name"] == undefined ? "" : d["name"]}">
                        <div class="flex_center">
                            <div style="width:90%;max-height:50vh;overflow-y:scroll">${f}</div>
                        </div>

                        <div class="flex_center">
                <div class="flex_center level2bg" style="margin:10px;border-radius:10px;padding:10px">
                    <input type="checkbox" id="overlayContent_Flagged" ${d["flagged"] == undefined || d["flagged"] == false ? "" : "checked"}>
                    <span class="text small" style="margin-left:10px">Flagged</span>
                </div>
            
            </div>
        
                        <div class="flex_center" style="margin:10px">
                            <div class="container level2bg clickable" id="overlayContent_deleteDocument" style="padding:10px">
                                <span class="text caption">Delete Document</span>
                            </div>
                        </div>
                        `;
                    }catch(e){
                        var fieldHTML = "";
                        formData.forEach(f => {
                            fieldHTML += `
                                <div class="container level2bg" style="margin:2px;padding:4px 6px">
                                    <span class="text small">${f}</span>
                                </div>
                            `
                        });
    
                        document.querySelector("#overlayContent").innerHTML = `
                        <input type="text" class="input" placeholder="Document Name (Optional)" id="overlayContent_Name" value="${d["name"] == undefined ? "" : d["name"]}">
                        <span class="textslim"><i>Sorry, we found your schema, but something went wrong parsing it with the following data</i></span>
                        <div class="flex_center" style="margin:5px;flex-wrap:wrap">
                            ${fieldHTML}
                        </div>

                        <div class="flex_center">
                <div class="flex_center level2bg" style="margin:10px;border-radius:10px;padding:10px">
                    <input type="checkbox" id="overlayContent_Flagged" ${d["flagged"] == undefined || d["flagged"] == false ? "" : "checked"}>
                    <span class="text small" style="margin-left:10px">Flagged</span>
                </div>
            
            </div>

                        <div class="flex_center" style="margin:10px">
                            <div class="container level2bg clickable" id="overlayContent_deleteDocument" style="padding:10px">
                                <span class="text caption">Delete Document</span>
                            </div>
                        </div>
                        `;
                    }
                    
                }

                

            }catch(ex){
                var fieldHTML = "";
                

                document.querySelector("#overlayContent").innerHTML = `
                <input type="text" class="input" placeholder="Document Name (Optional)" id="overlayContent_Name" value="${d["name"] == undefined ? "" : d["name"]}">
                <span class="textslim"><i>Sorry, we found your schema, but something went wrong parsing it with the following data</i></span>
                <div class="flex_center" style="margin:5px">
                    <span class="textslim">${data["data"]}</span>
                </div>

                <div class="flex_center">
                <div class="flex_center level2bg" style="margin:10px;border-radius:10px;padding:10px">
                    <input type="checkbox" id="overlayContent_Flagged" ${d["flagged"] == undefined || d["flagged"] == false ? "" : "checked"}>
                    <span class="text small" style="margin-left:10px">Flagged</span>
                </div>
            
            </div>
                
                <div class="flex_center" style="margin:10px">
                    <div class="container level2bg clickable" id="overlayContent_deleteDocument" style="padding:10px">
                        <span class="text caption">Delete Document</span>
                    </div>
                </div>
                `;
            }
            
            overlaySaveFunction = () => {
                var name = document.querySelector("#overlayContent_Name").value;
                var flagged = document.querySelector("#overlayContent_Flagged").checked;
                put("/api/document", {}, {name: name, docId: d["_id"], flagged: flagged}, (success, data) => {
                    if(activeItem["number"] == undefined){
                        handle_match_click(currentMatch["_id"]);
                    }else{
                        handle_team_click(currentTeam["number"]);
                    }
                });
                document.querySelector("#overlay").style.display = "none";
            }

            document.querySelector("#overlayContent_deleteDocument").addEventListener("click", function(e){
                if(!overlaySaveData["deleteConfirm"]){
                    overlaySaveData["deleteTime"] = new Date();
                    document.querySelector("#overlayContent_deleteDocument").innerHTML = `<span class="text caption">Are You Sure?</span>`;
                    document.querySelector("#overlayContent_deleteDocument").classList = "container redbg clickable";
                    overlaySaveData["deleteConfirm"] = true;
                }else{
                    if(overlaySaveData["deleteTime"] == undefined){
                        document.querySelector("#overlayContent_deleteDocument").innerHTML = `<span class="text caption">Delete Document</span>`;
                        document.querySelector("#overlayContent_deleteDocument").classList = "container level2bg clickable";
                        overlaySaveData["deleteConfirm"] = false;
                    }
                    if(new Date() - overlaySaveData["deleteTime"] > 1500){
                        document.querySelector("#overlayContent_deleteDocument").innerHTML = `<span class="text caption">Delete Document</span>`;
                        document.querySelector("#overlayContent_deleteDocument").classList = "container level2bg clickable";
                        overlaySaveData["deleteConfirm"] = false;
                        return;
                    }
                    document.querySelector("#overlayContent_deleteDocument").innerHTML = `<span class="text caption">Deleting...</span>`;
                    document.querySelector("#overlayContent_deleteDocument").classList = "container redbg clickable";
                    overlaySaveData["deleteConfirm"] = false;

                    remove("/api/document", {}, {docId: overlaySaveData["document"]}, (success, data) => {
                        if(success){
                            document.querySelector("#overlayContent_deleteDocument").innerHTML = `<span class="text caption">Deleted</span>`;
                            document.querySelector("#overlayContent_deleteDocument").classList = "container redbg clickable";
                            activeItem["documents"].splice(activeItem["documents"].indexOf(d => d._id == overlaySaveData["document"]), 1);
                            if(activeItem["number"] == undefined){
                                handle_match_click(currentMatch["_id"]);
                            }else{
                                handle_team_click(currentTeam["number"]);
                            }
                            setTimeout(function(){
                                document.querySelector("#overlayClose").click();
                            }, 500);
                        }else{
                            document.querySelector("#overlayContent_deleteDocument").innerHTML = `<span class="text caption">Delete Document</span>`;
                            document.querySelector("#overlayContent_deleteDocument").classList = "container level2bg clickable";
                            overlaySaveData["deleteConfirm"] = false;
                        }
                    });
                    
                }
            });

            document.querySelector("#overlayClose").style.display = "";
            document.querySelector("#overlayDone").style.display = "";

            var matchText = match != undefined ? ` - Match ${match}` : "";
            document.querySelector("#overlayTitle").innerHTML = `Data Document - Team ${teamNumber}${data["author"] == undefined || data["author"] == "" ? "" : " - By " + data["author"]}${data["completed"] == undefined || data["completed"] == false ? " (Incomplete)" : ""}${matchText}`;
            break;
        case "note":
            var teamNumber = data["team"];
            var contents = data["contents"] == undefined ? "" : data["contents"];
            var author = data["author"] == undefined ? "Anonymous" : data["author"];
            var match = data["match"];
            var matchText = match != undefined ? ` - Match ${match}` : "";
            if(data["name"] == "" || data["name"] == undefined){
                document.querySelector("#overlayTitle").innerHTML = `Extra Note${teamNumber != undefined && teamNumber != "" ? " (" + teamNumber + ")" : ""} - By ${author}${matchText}`;
            }else{
                document.querySelector("#overlayTitle").innerHTML = `${data["name"]}${teamNumber != undefined && teamNumber != "" ? " (" + teamNumber + ")" : ""} - By ${author}${matchText}`;
            }
            

            document.querySelector("#overlayContent").innerHTML = `
            <input type="text" class="input" placeholder="Document Name (Optional)" id="overlayContent_Name" value="${d["name"] == undefined ? "" : d["name"]}">
            <textarea class="input" id="overlayContent_contents" style="width:100%;height:200px;resize:none" disabled>${contents}</textarea>
            <div class="flex_center">
                <div class="flex_center level2bg" style="margin:10px;border-radius:10px;padding:10px">
                    <input type="checkbox" id="overlayContent_Flagged" ${d["flagged"] == undefined || d["flagged"] == false ? "" : "checked"}>
                    <span class="text small" style="margin-left:10px">Flagged</span>
                </div>
            
            </div>
            

            <div class="flex_center" style="margin:10px">
                <div class="container level2bg clickable" id="overlayContent_editDocument" style="padding:10px;margin-right:10px">
                    <span class="text caption">Edit Contents</span>
                </div>
                <div class="container level2bg clickable" id="overlayContent_deleteDocument" style="padding:10px">
                    <span class="text caption">Delete Document</span>
                </div>
            </div>
            `;

            overlaySaveFunction = () => {
                var name = document.querySelector("#overlayContent_Name").value;
                var flagged = document.querySelector("#overlayContent_Flagged").checked;
                put("/api/document", {}, {name: name, docId: d["_id"], flagged: flagged}, (success, data) => {
                    if(activeItem["number"] == undefined){
                        handle_match_click(currentMatch["_id"]);
                    }else{
                        handle_team_click(currentTeam["number"]);
                    }
                });
                document.querySelector("#overlay").style.display = "none";
            }

            // Specific Overlay Events
            document.querySelector("#overlayContent_editDocument").addEventListener("click", function(e){
                if(overlaySaveData["editing"]){
                    document.querySelector("#overlayContent_editDocument").innerHTML = `<span class="text caption">Saving</span>`;
                    document.querySelector("#overlayContent_editDocument").classList = "container primarybg clickable";
                    document.querySelector("#overlayContent_contents").disabled = true;
                    overlaySaveData["editing"] = false;
                    var editedDocument = activeItem["documents"].find((i) => i["_id"] == overlaySaveData["document"]);
                    var object = JSON.parse(editedDocument["json"]);
                    object["contents"] = document.querySelector("#overlayContent_contents").value;
                    editedDocument["json"] = JSON.stringify(object);
                    
                    activeItem["documents"][activeItem["documents"].findIndex((i) => i["_id"] == overlaySaveData["document"])] = editedDocument;
                    put("/api/document", {}, {docId: overlaySaveData["document"], json: editedDocument["json"]}, (success, data) => {
                        document.querySelector("#overlayContent_editDocument").innerHTML = `<span class="text caption">Edit Contents</span>`;
                        document.querySelector("#overlayContent_editDocument").classList = "container level2bg clickable";
                        document.querySelector("#overlayContent_contents").disabled = true;
                        overlaySaveData["editing"] = false;
                    });
                }else{
                    document.querySelector("#overlayContent_contents").disabled = false;
                    document.querySelector("#overlayContent_editDocument").classList = "container primarybg clickable";
                    document.querySelector("#overlayContent_editDocument").innerHTML = `<span class="text caption">Save Contents</span>`;
                    overlaySaveData["editing"] = true;
                }
                
            });
            
            document.querySelector("#overlayContent_deleteDocument").addEventListener("click", function(e){
                if(!overlaySaveData["deleteConfirm"]){
                    overlaySaveData["deleteTime"] = new Date();
                    document.querySelector("#overlayContent_deleteDocument").innerHTML = `<span class="text caption">Are You Sure?</span>`;
                    document.querySelector("#overlayContent_deleteDocument").classList = "container redbg clickable";
                    overlaySaveData["deleteConfirm"] = true;
                }else{
                    if(overlaySaveData["deleteTime"] == undefined){
                        document.querySelector("#overlayContent_deleteDocument").innerHTML = `<span class="text caption">Delete Document</span>`;
                        document.querySelector("#overlayContent_deleteDocument").classList = "container level2bg clickable";
                        overlaySaveData["deleteConfirm"] = false;
                    }
                    if(new Date() - overlaySaveData["deleteTime"] > 1500){
                        document.querySelector("#overlayContent_deleteDocument").innerHTML = `<span class="text caption">Delete Document</span>`;
                        document.querySelector("#overlayContent_deleteDocument").classList = "container level2bg clickable";
                        overlaySaveData["deleteConfirm"] = false;
                        return;
                    }
                    document.querySelector("#overlayContent_deleteDocument").innerHTML = `<span class="text caption">Deleting...</span>`;
                    document.querySelector("#overlayContent_deleteDocument").classList = "container redbg clickable";
                    overlaySaveData["deleteConfirm"] = false;

                    remove("/api/document", {}, {docId: overlaySaveData["document"]}, (success, data) => {
                        if(success){
                            document.querySelector("#overlayContent_deleteDocument").innerHTML = `<span class="text caption">Deleted</span>`;
                            document.querySelector("#overlayContent_deleteDocument").classList = "container redbg clickable";
                            currentMatch["documents"].splice(currentMatch["documents"].indexOf(d => d._id == overlaySaveData["document"]), 1);
                            handle_match_click(currentMatch["_id"]);
                            setTimeout(function(){
                                document.querySelector("#overlayClose").click();
                            }, 500);
                        }else{
                            document.querySelector("#overlayContent_deleteDocument").innerHTML = `<span class="text caption">Delete Document</span>`;
                            document.querySelector("#overlayContent_deleteDocument").classList = "container level2bg clickable";
                            overlaySaveData["deleteConfirm"] = false;
                        }
                    });
                    
                }
            });

            break;
    }



    document.querySelector("#overlay").style.display = "";
}


document.querySelector("#match_view_create_document").addEventListener("click", function(e){
    document.querySelector("#overlayContent").innerHTML = `
    <textarea class="input" style="width:100%;height:200px;resize:none" placeholder="Enter your note here" id="overlayContent_Note"></textarea>
    <input type="text" class="input" placeholder="Author (Optional)" id="overlayContent_Author">
    <input type="number" class="input" placeholder="Team Number" id="overlayContent_Number">
    <input type="text" class="input" placeholder="Document Name (Optional)" id="overlayContent_Name">
    `;

    document.querySelector("#overlayTitle").innerHTML = `Create New Document`;

    overlaySaveFunction = () => {
        var note = document.querySelector("#overlayContent_Note").value;
        var author = document.querySelector("#overlayContent_Author").value;
        var team = document.querySelector("#overlayContent_Number").value;
        var name = document.querySelector("#overlayContent_Name").value;


        post("/api/document", {}, {
            dataType: "match",
            image: undefined,
            json: JSON.stringify({
                team: team,
                contents: note,
                author: author,
                type: "note",
                match: currentMatch["matchNumber"]
            }),
            name: name
        }, (success, data) => {
            console.log(data);
            var _id = data["document"]["_id"];
            currentMatch["documents"].push({
                dataType: "match",
                image: undefined,
                json: JSON.stringify({
                    team: team,
                    contents: note,
                    author: author,
                    type: "note"
                }),
                datetime: new Date().toLocaleString(),
                _id: _id
            });
            post("/api/match/document", {}, {
                matchId: currentMatch["_id"],
                docId: _id
            }, (success, data) => {
                console.log(data);
            });
        })

        

        handle_match_click(currentMatch["_id"]);

        document.querySelector("#overlay").style.display = "none";
    };
    document.querySelector("#overlay").style.display = "";
});

function handle_team_match_click(num, color){
    if(num == "*"){
        currentTeamsFiltered.filter((i) => i["match"] == currentMatch["_id"]).forEach((i) => {
            document.querySelector('.selectTeamMatch[data-team="'+i["team"]+'"]').classList = "highlightedtext caption dim" + i["color"] + "bg textslim clickable selectTeamMatch nonselected_border";
            currentTeamsFiltered.splice(currentTeamsFiltered.indexOf(i), 1);
        });
        document.querySelector('.selectTeamMatch[data-team="*"]').classList = "highlightedtext caption whitebg textslim clickable selectTeamMatch selected_border";
        show_hide_documents();
        return;
    }
    var currentInstance = currentTeamsFiltered.find((i) => i["team"] == num && i["color"] == color && i["match"] == currentMatch["_id"]);
    if(currentInstance == undefined){
        document.querySelector('.selectTeamMatch[data-team="'+num+'"]').classList = "highlightedtext caption " + color + "bg textslim clickable selectTeamMatch selected_border";
        currentTeamsFiltered.push({
            "team": num,
            "color": color,
            "match": currentMatch["_id"]
        })
        document.querySelector('.selectTeamMatch[data-team="*"]').classList = "highlightedtext caption dimwhitebg textslim clickable selectTeamMatch nonselected_border";
    }else{
        document.querySelector('.selectTeamMatch[data-team="'+num+'"]').classList = "highlightedtext caption dim" + color + "bg textslim clickable selectTeamMatch nonselected_border";
        currentTeamsFiltered.splice(currentTeamsFiltered.indexOf(currentInstance), 1);
        if(currentTeamsFiltered.filter((i) => i["match"] == currentMatch["_id"]).length == 0){
            document.querySelector('.selectTeamMatch[data-team="*"]').classList = "highlightedtext caption whitebg textslim clickable selectTeamMatch selected_border";
        }
    }
    show_hide_documents();
    
}

function handle_match_click(m){
    var match = persistantData["matches"].find(i => i["_id"] == m);

    if(currentMatch != undefined){
        Array.from(document.querySelectorAll('.selectMatch[data-id="' + currentMatch["_id"] + '"]')).forEach((i) => {
            i.classList = "container level1bg clickable selectMatch";
            i.style.marginLeft = "10px";
        });
    }

    currentMatch = match;
    activeItem = currentMatch;
    if(match == undefined){
        return;
    }

    Array.from(document.querySelectorAll('.selectMatch[data-id="' + currentMatch["_id"] + '"]')).forEach((i) => {
        i.classList = "container primarybg clickable selectMatch";
        i.style.marginLeft = "20px";
    });

    var matchDocuments = match["documents"].filter(i => i["dataType"] == "paper");

    document.querySelector('#match_view_name').innerHTML = `Match ${match["matchNumber"]}`;
    
    if(!match["results"]["finished"]){
        document.querySelector('#match_view_score').style.display = "none";

    }else{
        document.querySelector('#match_view_score').style.display = "";
        document.querySelector('#match_view_score').innerHTML = `${match["results"]["red"] == match["results"]["blue"] ? `Tie (${match["results"]["red"]}-${match["results"]["blue"]})` : (match["results"]["red"] > match["results"]["blue"] ? `Red (${match["results"]["red"]}-${match["results"]["blue"]})` : `Blue (${match["results"]["blue"]}-${match["results"]["red"]})`)}`;
        document.querySelector('#match_view_score').classList = `${match["results"]["red"] == match["results"]["blue"] ? "highlightedtext caption whitebg textslim clickable" : (match["results"]["red"] > match["results"]["blue"] ? "highlightedtext caption redbg textslim clickable" : "highlightedtext caption bluebg textslim clickable")}`;

    }

    document.querySelector('#match_view_status').innerHTML = `${match["results"]["finished"] ? 'Past' : 'Waiting'}`;
    document.querySelector('#match_view_status').classList = `${match["results"]["finished"] ? 'highlightedtext caption greenbg textslim' : 'highlightedtext caption level2bg textslim'}`;
    
    var tf = "";

    match["teams"].forEach((t)=>{
        var existingInstance = currentTeamsFiltered.find((i) => i["team"] == t["team"] && i["color"] == t["color"] && i["match"] == match["_id"]);
        tf += `
        <span style="font-size:18px;width:10%;border-radius:16px;pointer-events:all" class="highlightedtext caption ${existingInstance == undefined ? "nonselected_border dim" : "selected_border "}${t["color"]}bg textslim selectTeamMatch clickable" data-team="${t["team"]}" data-color="${t["color"]}">${t["team"]}</span>
        `;
    });
    tf += `
        <span style="font-size:18px;width:10%;border-radius:16px;pointer-events:all" class="highlightedtext caption dimwhitebg textslim selectTeamMatch clickable nonselected_border" data-team="*" data-color="white">ALL</span>
        `;

        

    document.querySelector('#match_view_teams').innerHTML = tf;

    if(currentTeamsFiltered.filter((i) => i["match"] == match["_id"]).length == 0){
        document.querySelector('.selectTeamMatch[data-team="*"]').classList = "highlightedtext caption whitebg textslim clickable selectTeamMatch selected_border";
    }
    var df = "";
    
    cachedDocuments = match["documents"];
    match["documents"].forEach((d)=>{
        df += generate_document_snip(d, "level2bg","");


        

        
    });

    if(match["documents"].length == 0){
        df += `
        <span class="text regular" style="font-weight:600;opacity:0.5">Stop it, get some documents...</span>
        `;
    } else{
        df += `
        <span class="text caption" style="font-weight:600;opacity:0.5;display:none" id="match_view_emptyMessage">No documents can be found... Change your filter</span>
        `;
    }

    
    document.querySelector('#match_view_documents').innerHTML = df;


   

    Array.from(document.querySelectorAll('.selectTeamMatch')).forEach((i) => {
        i.addEventListener('click', function(e){
            handle_team_match_click(e.srcElement.dataset.team, e.srcElement.dataset.color);
        })
    });


    document.querySelector('#match_view_container').style.display = "";

    
}

document.querySelector('#match_view_score').addEventListener('click', function(){
    // show match stats
    document.querySelector("#overlayDone").style.display = "none";
    document.querySelector("#overlayTitle").innerHTML = "Match " + currentMatch.matchNumber + " Stats";
    var fHTML = "";
    // get keys thru red alliance and then go to blue alliance
    var keys = Object.keys(currentMatch["results"]["redStats"]);

    for(var i = 0; i < keys.length; i++){
        var k = keys[i];
        var blueRes = currentMatch["results"]["blueStats"][k];
        var redRes = currentMatch["results"]["redStats"][k];

        if(k == "rp"){

            var rpRHTML = "";
            var rpBHTML = "";

            for (var rp = 0; rp < redRes; rp++) {
                rpRHTML += `<div style="background-color:white;border-radius:4px;transform:rotate(45deg);width:16px;height:16px;margin:2px 4px"></div>`;
            }
            if(redRes == 0){
                rpRHTML += `<span class="text small" style="opacity:0.5">None</span>`;
            }
            for(var rp = 0; rp < blueRes; rp++){
                rpBHTML += `<div style="background-color:white;border-radius:4px;transform:rotate(45deg);width:16px;height:16px;margin:2px 4px"></div>`;
            }
            if(blueRes == 0){
                rpBHTML += `<span class="text small" style="opacity:0.5">None</span>`;
            }

            fHTML += `
                <div class="flex_apart">
                    <span class="text regular" style="width:50%">${k}</span>
                    <div class="flex_apart" style="width:45%">
                        <div class="redbg flex_center" style="padding:10px;width:140px;">
                            ${rpRHTML}
                        </div>
                        <div class="bluebg flex_center" style="padding:10px;width:140px;">
                            ${rpBHTML}
                        </div>
                        
                        
                    </div>
                </div>
                `;



            continue;
        }

        switch(typeof redRes){
            case "number":
                fHTML += `
                <div class="flex_apart">
                    <span class="text regular" style="width:50%">${k}</span>
                    <div class="flex_apart" style="width:45%">
                        <div class="redbg flex_center" style="padding:10px;width:140px;">
                            <span class="text small">${redRes}</span>
                        </div>
                        <div class="bluebg flex_center" style="padding:10px;width:140px;">
                            <span class="text small">${redRes}</span>
                        </div>
                        
                        
                    </div>
                </div>
                
                `;
                break;
            case "string":
                fHTML += `
                <div class="flex_apart">
                    <span class="text regular" style="width:50%">${k}</span>
                    <div class="flex_apart" style="width:45%">
                        <div class="redbg flex_center" style="padding:10px;width:140px;">
                            <span class="text small">${redRes}</span>
                        </div>
                        <div class="bluebg flex_center" style="padding:10px;width:140px;">
                            <span class="text small">${redRes}</span>
                        </div>
                        
                        
                    </div>
                </div>
                
                `;
                break;
            case "boolean":
                fHTML += `
                <div class="flex_apart">
                    <span class="text regular" style="width:50%">${k}</span>
                    <div class="flex_apart" style="width:45%">
                        <div class="redbg flex_center" style="padding:10px;width:140px;">
                            <span class="text regular material-symbols-rounded">${redRes?"check":"close"}</span>
                        </div>
                        <div class="bluebg flex_center" style="padding:10px;width:140px;">
                            <span class="text regular material-symbols-rounded">${blueRes?"check":"close"}</span>
                        </div>
                        
                        
                    </div>
                </div>
                
                `;
                break;

        }
        

    }

    document.querySelector("#overlayContent").innerHTML = `
    
    <div style="max-height:60vh;overflow-y:scroll">
        ${fHTML}
    </div>

    `;
    document.querySelector("#overlayClose").style.display = "";
    document.querySelector("#overlayDone").style.display = "none";

    document.querySelector("#overlay").style.display = "";

});


function handle_team_click(t){
    var team = persistantData["teams"].find(i => i["number"] == t);

    if(currentTeam != undefined){
        Array.from(document.querySelectorAll('.selectTeam[data-id="' + currentTeam["number"] + '"]')).forEach((i) => {
            i.classList = "container level1bg clickable selectTeam";
            i.style.marginLeft = "10px";
        });
    }

    currentTeam = team;
    activeItem = currentTeam;
    if(team == undefined){
        return;
    }

    Array.from(document.querySelectorAll('.selectTeam[data-id="' + currentTeam["number"] + '"]')).forEach((i) => {
        i.classList = "container primarybg clickable selectTeam";
        i.style.marginLeft = "20px";
    });

    var teamDocuments = team["documents"].filter(i => i["dataType"] == "paper");


    var knownTeam = persistantData["knownTeams"].find(i => i["teamNumber"] == team["number"]);
    if(knownTeam != undefined){
        document.querySelector('#team_view_name').innerHTML = `${knownTeam["name"]}`;
    }else{
        document.querySelector('#team_view_name').innerHTML = `Unnamed Team`;
    }
    
    document.querySelector('#team_view_number').innerHTML = `#${team["number"]}`;

    
    var df = "";
    
    cachedDocuments = team["documents"];
    team["documents"].forEach((d)=>{
        df += generate_document_snip(d, "level2bg","");

        
    });

    if(team["documents"].length == 0){
        df += `
        <span class="text regular" style="font-weight:600;opacity:0.5">No Documents :(</span>
        `;
    }

    
    document.querySelector('#team_view_documents').innerHTML = df;


    Array.from(document.querySelectorAll(".document")).forEach((i) => {
        i.addEventListener("click", (e) => {
            handle_document_click(e.target.dataset.id);
        });
    })

    show_hide_documents();

    document.querySelector('#team_view_container').style.display = "";

    
}



document.querySelector('#match_view_close').addEventListener('click', function(){
    document.querySelector('#match_view_container').style.display = "none";
    if(currentMatch != undefined){
        Array.from(document.querySelectorAll('.selectMatch[data-id="' + currentMatch["_id"] + '"]')).forEach((i) => {
            i.classList = "container level1bg clickable selectMatch";
            i.style.marginLeft = "0px";
        });
    }
});

document.querySelector('#team_view_close').addEventListener('click', function(){
    document.querySelector('#team_view_container').style.display = "none";
    if(currentMatch != undefined){
        Array.from(document.querySelectorAll('.selectTeam[data-id="' + currentTeam["number"] + '"]')).forEach((i) => {
            i.classList = "container level1bg clickable selectTeam";
            i.style.marginLeft = "0px";
        });
    }
});

var deleteMatchTimer = undefined;
var deleteMatchConfirm = false;
document.querySelector('#match_view_delete').addEventListener('click', function(){
    if(!deleteMatchConfirm){
        deleteMatchTimer = new Date();
        document.querySelector('#match_view_delete').innerHTML = `<span class="text caption">Are You Sure?</span>`;
        document.querySelector('#match_view_delete').classList = "container redbg clickable";
        deleteMatchConfirm = true;
    }else{
        if(deleteMatchTimer == undefined){
            document.querySelector('#match_view_delete').innerHTML = `<span class="text caption">Delete Match</span>`;
            document.querySelector('#match_view_delete').classList = "container level2bg clickable";
            deleteMatchConfirm = false;
        }
        if(new Date() - deleteMatchTimer > 1500){
            document.querySelector('#match_view_delete').innerHTML = `<span class="text caption">Delete Match</span>`;
            document.querySelector('#match_view_delete').classList = "container level2bg clickable";
            deleteMatchConfirm = false;
            return;
        }
        document.querySelector('#match_view_delete').innerHTML = `<span class="text caption">Deleting...</span>`;
        document.querySelector('#match_view_delete').classList = "container redbg clickable";
        deleteMatchConfirm = false;

        remove("/api/match", {}, {matchId: currentMatch["_id"]}, (success, data) => {
            if(success){
                document.querySelector('#match_view_delete').innerHTML = `<span class="text caption">Deleted</span>`;
                document.querySelector('#match_view_delete').classList = "container redbg clickable";
                pull_matches((ms, allDocs)=>{
                    matches = ms;
                    document.querySelector('#match_list').innerHTML = "";
                    document.querySelector('#match_view_container').style.display = "none";
                    persistantData["matches"] = ms;
                    persistantData["allDocuments"] = allDocs;
                    handle_filter_documents(allDocs);
                    handle_matches(ms);
                });
                setTimeout(function(){
                    document.querySelector('#match_view_container').style.display = "none";
                    document.querySelector('#match_view_delete').innerHTML = `<span class="text caption">Delete Match</span>`;
                    document.querySelector('#match_view_delete').classList = "container level2bg clickable";
                }, 500);
            }else{
                document.querySelector('#match_view_delete').innerHTML = `<span class="text caption">Delete Match</span>`;
                document.querySelector('#match_view_delete').classList = "container level2bg clickable";
                deleteMatchConfirm = false;
            }
        });
        
    }
});

document.querySelector("#match_createMatch").addEventListener("click", function(){
    document.querySelector("#overlayTitle").innerHTML = "Create Match";
    document.querySelector("#overlayClose").style.display = "";


    var redTeamEntryHTML = ""
    var blueTeamEntryHTML = ""
    for(var i = 1; i <= settings["teamsPerColor"]; i++){
        redTeamEntryHTML += `
            <input type="number" class="input text regular redbg overlay_team" data-num="${i}" style="pointer-events: all;margin:5px" placeholder="999${i}">
        `;
        blueTeamEntryHTML += `
        <input type="number" class="input text regular bluebg overlay_team" data-num="${i+parseInt(settings["teamsPerColor"])}" style="pointer-events: all;margin:5px" placeholder="999${i+parseInt(settings["teamsPerColor"])}">
        `
    }

    document.querySelector("#overlayContent").innerHTML = `
    <div>
        <div class="flex_apart" style="margin:25px 5px">
            <span class="text small" style="margin:5px;display:inline-block;width:50%">Match Number</span>
            <input type="number" class="input text small" style="pointer-events: all;width:50%" id="overlay_matchNumber"/>
        </div>
        <span class="text small" style="margin:10px">Teams (#1 on left)</span>
        <div class="container dimredbg flex_apart" style="margin:5px;padding:10px">
        ${redTeamEntryHTML}
        </div>
        <div class="container dimbluebg flex_apart" style="margin:5px;padding:10px">
        ${blueTeamEntryHTML}
        </div>
    </div>
        
    `;

    overlaySaveFunction = (e) => {
        var prevMatchObject = persistantData["matches"].find((i) => i["matchNumber"] == parseInt(document.querySelector("#overlay_matchNumber").value && i["competition"] == settings["competitionYear"] + settings["competitionCode"]));
        if(prevMatchObject == undefined){
            var sendObject = {
                "matchNumber": parseInt(document.querySelector("#overlay_matchNumber").value),
                "environment": environmentData["friendlyId"],
                "teams": [],
                "competition": settings["competitionYear"] + settings["competitionCode"],
                "documents": []
            }
    
            for(var i = 1; i <= settings["teamsPerColor"]*2; i++){
                var teamNumber = parseInt(document.querySelector(".overlay_team[data-num='" + i + "']").value);
                if(!isNaN(teamNumber)){
                    sendObject["teams"].push({
                        team: teamNumber,
                        color: i <= settings["teamsPerColor"] ? "red" : "blue"
                    });
                }else{
                    return;
                }
            }
    
            document.querySelector("#overlayDone").style.display = "none";
    
            post("/api/match", {}, {
                "matchNumber": sendObject["matchNumber"],
                "competition": sendObject["competition"],
                "environment": sendObject["environment"],
                "documents": sendObject["documents"],
                "teams": sendObject["teams"],
                "locked": false,
                "date": new Date()
            }, function(success, data){
                pull_matches((ms, allDocs)=>{
                    matches = ms;
                    document.querySelector('#match_list').innerHTML = "";
                    document.querySelector('#match_view_container').style.display = "none";
                    persistantData["matches"] = ms;
                    persistantData["allDocuments"] = allDocs;
                    handle_filter_documents(allDocs);
                    handle_matches(ms);
                });
            })
    
            matches.push(sendObject);
            document.querySelector("#overlay").style.display = "none";
            persistantData["matches"] = matches;
            handle_matches(matches);
        }else{
            alert("Match " + document.querySelector("#overlay_matchNumber").value + " already exists!");
        }
        

    };
    document.querySelector("#overlay").style.display = "";
});



var currentScreen = 0;

var onScreenEvents = {
    0: function(){

    },
    1: function(){
        pull_matches((ms, allDocs)=>{
            matches = ms;
            document.querySelector('#match_list').innerHTML = "";
            document.querySelector('#match_view_container').style.display = "none";
            persistantData["matches"] = ms;
            persistantData["allDocuments"] = allDocs;
            handle_filter_documents(allDocs);
            handle_matches(ms);



        });
        
    },
    2: function(){
        
    },
    3: function(){
        document.querySelector('#role_view_container').style.display = "none";
    }
}


var currentSubscreen = 0;
Array.from(document.getElementsByClassName("subscreen")).forEach(s => {
    if(s.dataset.subscreen != currentSubscreen){
        s.style.display = "none";
    }
})

function changeSubscreen(to){
    Array.from(document.querySelectorAll('.changeSubscreen[data-subscreen="' + to + '"]')).forEach((i) => {
        i.classList = "primarybg container clickable changeSubscreen"
        
    })
    Array.from(document.querySelectorAll('.subscreen[data-subscreen="'+to+'"]')).forEach((i) => {
        i.style.display = "";
    })
    Array.from(document.querySelectorAll('.changeSubscreen[data-subscreen="' + currentSubscreen + '"]')).forEach((i) => {
        i.classList = "level1bg container clickable changeSubscreen"
        
    })
    Array.from(document.querySelectorAll('.subscreen[data-subscreen="'+currentSubscreen+'"]')).forEach((i) => {
        i.style.display = "none";
    })
    
    currentSubscreen = to;
}
Array.from(document.getElementsByClassName("changeSubscreen")).forEach((item)=>{
    item.addEventListener("click", function(e){
        if(e.srcElement.dataset.subscreen != currentSubscreen){
            changeSubscreen(e.srcElement.dataset.subscreen);
        }
    })
})


Array.from(document.getElementsByClassName("screen")).forEach(s => {
    if(s.dataset.screen != currentScreen){
        s.style.display = "none";
    }
})

function changeScreen(to){
    Array.from(document.querySelectorAll('.screen[data-screen="'+to+'"]')).forEach((i) => {
        i.style.display = "";
    })
    Array.from(document.querySelectorAll('.screen[data-screen="'+currentScreen+'"]')).forEach((i) => {
        i.style.display = "none";
    })
    
    currentScreen = to;
    onScreenEvents[to]();
}
Array.from(document.getElementsByClassName("changeScreen")).forEach((item)=>{
    item.addEventListener("click", function(e){
        changeScreen(e.srcElement.dataset.screen);
    })
})

function generate_graph(button){
    var teamOptions = document.getElementById('analysis_teams').selectedOptions;
    var teams = Array.from(teamOptions).map(({ value }) => value);

    var matchOptions = document.getElementById('analysis_matches').selectedOptions;
    var matches = Array.from(matchOptions).map(({ value }) => value);

    var dataPoint = document.getElementById('analysis_dataPoint').value;

    // To have a proper graph, we need to have a data point
    if(dataPoint == ""){
        button.backgroundColor = "#910929";
        setTimeout(function(){
            button.backgroundColor = "";
        }, 1000);
        return;
    }
}

function show_analysis_chart_demo(){
    const data = {
        labels: ["12am-3am", "3am-6pm", "6am-9am", "9am-12am",
            "12pm-3pm", "3pm-6pm", "6pm-9pm", "9am-12am"
        ],
        datasets: [
            {
                name: "Some Data", type: "bar",
                values: [25, 40, 30, 35, 8, 52, 17, -4]
            },
            {
                name: "Another Set", type: "line",
                values: [25, 50, -10, 15, 18, 32, 27, 14]
            }
        ]
    }
    
    const chart = new frappe.Chart("#analysis_chart", {  // or a DOM element,
                                                // new Chart() in case of ES6 module with above usage
        title: "My Awesome Chart",
        data: data,
        type: 'axis-mixed', // or 'bar', 'line', 'scatter', 'pie', 'percentage'
        height: 400,
        colors: ['#7cd6fd', '#743ee2']
    })
}
show_analysis_chart_demo();

function analysis_preview_update_numbers(){
    var teamOptions = document.getElementById('analysis_teams').selectedOptions;
    var teams = Array.from(teamOptions).map(({ value }) => value);

    var matchOptions = document.getElementById('analysis_matches').selectedOptions;
    var matches = Array.from(matchOptions).map(({ value }) => value);

    document.getElementById("analysis_teams_count").innerHTML = teams.length + " selected";
    document.getElementById("analysis_matches_count").innerHTML = matches.length + " selected";
}

function analysis_update_schema(){
    var schema = schemas.find(s => s.Name == (settings["selectedSchema"] == undefined ? schemas[0].Name : settings["selectedSchema"]));
    var options = [];

    var n = 0;
    schema.Parts.forEach(p => {
        var prefix = "(" + p.Name + ") ";
        p.Components.forEach(c => {
            if(c.Type != "Label"){
                options.push({num: n, label: prefix + c.Name});
                n++;
            }
        });
    });

    //var select = document.getElementById("analysis_dataPoint");


    var optionHTML = "";
    options.forEach(o => {
        optionHTML += '<option value="' + o.num + '">' + o.label + '</option>';
    });
    document.getElementById("analysis_dataPoint").innerHTML = optionHTML;
}
