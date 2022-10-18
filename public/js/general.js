var environmentData = {};
var persistantData = {};

var showingContent = false;

function try_show_content(){
    if(showingContent == false){
        showingContent = true;
        document.querySelector("#contents").style.display = "";
        document.querySelector("#waiting").style.display = "none";
    }
}

function pull_environment(){
    get("/api/environment", {}, function(success, data){
        if(success){
            environmentData = data;
            try_show_content();
            handle_environment(data);
        }
    })
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
});


/*
    Differently Defined API Actions
*/

function pull_matches(cb=()=>{}){
    get("/api/matches", {}, function(success,data){
        cb(data);
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
    ms.forEach((m)=>{
        
        var tf = "";

        

        f += `
        <div class="container level1bg clickable selectMatch" style="width:100%;margin: 10px 0px" data-id="${m["_id"]}">
            <span class="text caption" style="text-align: left">Match ${m["matchNumber"]}</span>
            <span class="text small" style="text-align: left">${m["documents"].length} Document${m["documents"].length != 1 ? "s" : ""}</span>
            
        </div>`


    });
    document.querySelector('#match_list').innerHTML = f;


    Array.from(document.querySelectorAll('.selectMatch')).forEach((i) => {
        i.addEventListener('click', function(e){
            handle_match_click(e.srcElement.dataset.id);
        })
    });

}



/*
    Handle Different Interations
*/

var currentMatch = undefined;
var currentTeamsFiltered = [];
var cachedDocuments = [];

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
    document.querySelector("#overlay").style.display = "";
    var d = cachedDocuments.filter((i) => i["_id"] == id)[0];
    
    var data = JSON.parse(d["json"]);
    var datetime = new Date(d["datetime"]);
    datetime = datetime.toLocaleString();

    document.querySelector("#overlayContent").innerHTML = ``;
    switch(data["type"]){
        case "paper":
            var teamNumber = data["team"]
            document.querySelector("#overlayTitle").innerHTML = `Paper Document - Team ${teamNumber}`;
            break;
        case "tablet":
            var teamNumber = data["team"]
            document.querySelector("#overlayTitle").innerHTML = `Data Document - Team ${teamNumber}${data["completed"] == undefined || data["completed"] == false ? " (Incomplete)" : ""}`;
            break;
        case "note":
            var teamNumber = data["team"];
            var contents = data["contents"] == undefined ? "" : data["contents"];
            var author = data["author"] == undefined ? "Anonymous" : data["author"];
            document.querySelector("#overlayTitle").innerHTML = `Extra Note${teamNumber != undefined && teamNumber != "" ? " (" + teamNumber + ")" : ""} - By ${author}`;

            document.querySelector("#overlayContent").innerHTML = `
            <textarea class="input" style="width:100%;height:200px;resize:none" disabled>${contents}</textarea>
            `;

            break;
    }

    
}

function handle_team_click(num, color){
    if(num == "*"){
        currentTeamsFiltered.filter((i) => i["match"] == currentMatch["_id"]).forEach((i) => {
            document.querySelector('.selectTeam[data-team="'+i["team"]+'"]').classList = "highlightedtext caption dim" + i["color"] + "bg textslim clickable selectTeam nonselected_border";
            currentTeamsFiltered.splice(currentTeamsFiltered.indexOf(i), 1);
        });
        document.querySelector('.selectTeam[data-team="*"]').classList = "highlightedtext caption whitebg textslim clickable selectTeam selected_border";
        return;
    }
    var currentInstance = currentTeamsFiltered.find((i) => i["team"] == num && i["color"] == color && i["match"] == currentMatch["_id"]);
    if(currentInstance == undefined){
        document.querySelector('.selectTeam[data-team="'+num+'"]').classList = "highlightedtext caption " + color + "bg textslim clickable selectTeam selected_border";
        currentTeamsFiltered.push({
            "team": num,
            "color": color,
            "match": currentMatch["_id"]
        })
        document.querySelector('.selectTeam[data-team="*"]').classList = "highlightedtext caption dimwhitebg textslim clickable selectTeam nonselected_border";
    }else{
        document.querySelector('.selectTeam[data-team="'+num+'"]').classList = "highlightedtext caption dim" + color + "bg textslim clickable selectTeam nonselected_border";
        currentTeamsFiltered.splice(currentTeamsFiltered.indexOf(currentInstance), 1);
        if(currentTeamsFiltered.filter((i) => i["match"] == currentMatch["_id"]).length == 0){
            document.querySelector('.selectTeam[data-team="*"]').classList = "highlightedtext caption whitebg textslim clickable selectTeam selected_border";
        }
    }
    show_hide_documents();
    
}

function handle_match_click(m){
    var match = persistantData["matches"].find(i => i["_id"] == m);

    if(currentMatch != undefined){
        Array.from(document.querySelectorAll('.selectMatch[data-id="' + currentMatch["_id"] + '"]')).forEach((i) => {
            i.classList = "container level1bg clickable selectMatch";
            i.style.marginLeft = "0px";
        });
    }

    currentMatch = match;
    if(match == undefined){
        return;
    }

    Array.from(document.querySelectorAll('.selectMatch[data-id="' + currentMatch["_id"] + '"]')).forEach((i) => {
        i.classList = "container primarybg clickable selectMatch";
        i.style.marginLeft = "10px";
    });

    var matchDocuments = match["documents"].filter(i => i["dataType"] == "paper");

    document.querySelector('#match_view_name').innerHTML = `Match ${match["matchNumber"]}`;
    
    document.querySelector('#match_view_status').innerHTML = `${matchDocuments.length > environmentData["settings"]["teamsPerColor"]*2 ? 'Completed' : 'Waiting'}`;
    document.querySelector('#match_view_status').classList = `${matchDocuments.length > environmentData["settings"]["teamsPerColor"]*2 ? 'highlightedtext caption greenbg textslim' : 'highlightedtext caption level2bg textslim'}`;
    
    var tf = "";

    match["teams"].forEach((t)=>{
        var existingInstance = currentTeamsFiltered.find((i) => i["team"] == t["team"] && i["color"] == t["color"] && i["match"] == match["_id"]);
        tf += `
        <span style="font-size:18px;width:10%;border-radius:16px;pointer-events:all" class="highlightedtext caption ${existingInstance == undefined ? "nonselected_border dim" : "selected_border "}${t["color"]}bg textslim selectTeam clickable" data-team="${t["team"]}" data-color="${t["color"]}">${t["team"]}</span>
        `;
    });
    tf += `
        <span style="font-size:18px;width:10%;border-radius:16px;pointer-events:all" class="highlightedtext caption dimwhitebg textslim selectTeam clickable nonselected_border" data-team="*" data-color="white">ALL</span>
        `;

        

    document.querySelector('#match_view_teams').innerHTML = tf;

    if(currentTeamsFiltered.filter((i) => i["match"] == match["_id"]).length == 0){
        document.querySelector('.selectTeam[data-team="*"]').classList = "highlightedtext caption whitebg textslim clickable selectTeam selected_border";
    }
    var df = "";
    
    cachedDocuments = match["documents"];
    match["documents"].forEach((d)=>{
        var data = JSON.parse(d["json"]);
        var datetime = new Date(d["datetime"]);
        datetime = datetime.toLocaleString();


        switch(data["type"]){
            case "paper":

                
                df += `
                    <div class="container level2bg clickable document" style="width:180px;padding:15px 10px;margin:5px" data-team="${data["team"]}" data-id="${d["_id"]}">
                        <div class="flex_apart" style="width:100%;pointer-events:none">
                            <span class="text regular material-symbols-rounded" style="width:20%">edit_document</span>
                            <div style="width:80%">
                                <span class="text caption" style="font-weight:600">Team ${data["team"]}</span>
                                <span class="text tiny">${datetime}</span>
                            </div>
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
                    <div class="container level2bg clickable document" style="width:180px;padding:15px 10px;margin:5px" data-team="${data["team"]}" data-id="${d["_id"]}">
                        <div class="flex_apart" style="width:100%;pointer-events:none">
                            <span class="text regular material-symbols-rounded" style="width:20%">bar_chart</span>
                            <div style="width:80%">
                                <span class="text caption" style="font-weight:600">Team ${data["team"]}</span>
                                <span class="text tiny">${completed ? "" : "Not "}Complete</span>
                            </div>
                        </div>
                    </div>
                `
                break;
            case "note":
                
                var teamConcerned = data["team"];
                var author = data["author"];

                df += `
                    <div class="container level2bg clickable document" style="width:180px;padding:15px 10px;margin:5px" data-team="${data["team"]}" data-id="${d["_id"]}">
                        <div class="flex_apart" style="width:100%;pointer-events:none">
                            <span class="text regular material-symbols-rounded" style="width:20%">format_quote</span>
                            <div style="width:80%">
                                <span class="text caption" style="font-weight:600">${teamConcerned == undefined || teamConcerned == "" ? "Match Note": "Note on " + teamConcerned}</span>
                                <span class="text tiny">By ${data["author"] == undefined ? "Anonymous" : data["author"]}</span>
                            </div>
                        </div>
                    </div>
                `
        }

        
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


    Array.from(document.querySelectorAll(".document")).forEach((i) => {
        i.addEventListener("click", (e) => {
            handle_document_click(e.target.dataset.id);
        });
    })

    Array.from(document.querySelectorAll('.selectTeam')).forEach((i) => {
        i.addEventListener('click', function(e){
            handle_team_click(e.srcElement.dataset.team, e.srcElement.dataset.color);
        })
    });

    show_hide_documents();

    document.querySelector('#match_view_container').style.display = "";

    
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


var currentScreen = 0;

var onScreenEvents = {
    0: function(){

    },
    1: function(){
        pull_matches((ms)=>{
            document.querySelector('#match_list').innerHTML = "";
            document.querySelector('#match_view_container').style.display = "none";
            persistantData["matches"] = ms;
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





