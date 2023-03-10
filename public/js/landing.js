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

var teamNumber = undefined;
function getLatestData(){
    get("/api/environment", {}, function(success, data){
        teamNumber = data.environment.settings.team;
        get("/api/quick/matches?teamNumber=" + teamNumber, {}, function(success, data){
            var matches = data.matches.sort((a, b) => a.matchNumber - b.matchNumber);
            var nextUpMatch = matches.filter(match => match.finished == false)[0];
            if(nextUpMatch == undefined){
                document.getElementById("matchNumber").innerHTML = "No more matches";
                document.getElementById("matchStart").innerHTML = "";
                document.getElementById("redTeams").innerHTML = "";
                document.getElementById("blueTeams").innerHTML = "";

                return;
            }



            document.getElementById("matchNumber").innerHTML = "Match " + nextUpMatch.matchNumber;
            document.getElementById("matchStart").innerHTML = nextUpMatch.planned;

            var ourColor = nextUpMatch.teams.find(t => t.team == teamNumber).color;

            var redHTML = "";
            var blueHTML = "";

            nextUpMatch.teams.forEach(t => {
                if(t.color == "Red"){

                    redHTML += `
                    <div class="container ${ourColor == "Red" ? "redbg" : "dimredbg"}" style="padding:5px 8px;width:140px;margin:5px">
                        <span class="text important white">${t.team}</span>
                    </div>
                    `;
                }else{
                    blueHTML += `
                    <div class="container ${ourColor == "Blue" ? "bluebg" : "dimbluebg"}" style="padding:5px 8px;width:140px;margin:5px">
                        <span class="text important white">${t.team}</span>
                    </div>
                    `;
                }
            });

        });
    });
}

getLatestData();
setInterval(getLatestData, 10000);

Array.from(document.getElementsByClassName("widget")).forEach(w => {
    w.addEventListener('click', function(){
        var link = w.dataset.link;
        link = link.replace("[TEAM]", teamNumber);
        window.location = link;
    });
})