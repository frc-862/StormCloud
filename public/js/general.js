var environmentData = {};
var persistantData = {};

function pull_environment(){
    get("/api/environment", {}, function(success, data){
        if(success){
            environmentData = data;
            console.log(data);
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

function handle_matches(ms){
    document.querySelector('#match_list').innerHTML = "";
    var f = "";
    ms.forEach((m)=>{
        
        f += `
        <div class="container level1bg clickable selectMatch" style="width:100%" data-id="${m["_id"]}">
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

function handle_match_click(m){
    var match = persistantData["matches"].find(i => i["_id"] == m);
    if(match == undefined){
        return;
    }

    var matchDocuments = match["documents"].filter(i => i["dataType"] == "paper");

    document.querySelector('#match_view_name').innerHTML = `Match ${match["matchNumber"]}`;
    
    document.querySelector('#match_view_status').innerHTML = `${matchDocuments.length > environmentData["settings"]["teamsPerColor"]*2 ? 'Completed' : 'Waiting'}`;
    document.querySelector('#match_view_status').classList = `${matchDocuments.length > environmentData["settings"]["teamsPerColor"]*2 ? 'highlightedtext caption greenbg textslim' : 'highlightedtext caption level2bg textslim'}`;
    
    document.querySelector('#match_view_container').style.display = "";
}


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

    }
}

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





