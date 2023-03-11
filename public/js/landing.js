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
var nextUpMatchNumber = undefined;
var analysis = undefined;
function getLatestData(){
    get("/api/environment", {}, function(success, data){
        teamNumber = data.environment.settings.team;
        analysis = data.environment.settings.defaultAnalysis;
        get("/api/first/cache", {}, function(success, data){
            var rankings = data.cache.rankings;

            var ourRanking = rankings.filter(r => r.team == teamNumber)[0];
            document.getElementById("ranking").innerHTML = "Rank " + ourRanking.rank;
            document.getElementById("rankingPoints").innerHTML = ourRanking.rankingPoints + " RP (of " + ourRanking.matchesPlayed +" matches)";
            document.getElementById("record").innerHTML = ourRanking.record.wins + " / " + ourRanking.record.losses + " / " + ourRanking.record.ties;

            var behind = rankings.filter(r => r.rank < ourRanking.rank).sort((a, b) => b.rank - a.rank);
            var ahead = rankings.filter(r => r.rank > ourRanking.rank);

            var behindHTML = "";
            var aheadHTML = "";

            for(var i = 0; i < 3; i++){
                if(behind[2-i] != undefined){
                    behindHTML += `
                    <div class="container dimredbg" style="margin:5px;padding:5px">
                        <span class="text regular white">${behind[2-i].team} w/ ${behind[2-i].rankingPoints} RP</span>
                    </div>
                    `;
                }
                if(ahead[i] != undefined){
                    aheadHTML += `
                    <div class="container dimgreenbg" style="margin:5px;padding:5px">
                        <span class="text regular white">${ahead[i].team} w/ ${ahead[i].rankingPoints} RP</span>
                    </div>
                    `;
                }
            }

            document.getElementById("behind").innerHTML = behindHTML;
            document.getElementById("ahead").innerHTML = aheadHTML;
        });
        get("/api/quick/matches", {}, function(success, data){
            var matches = data.matches.sort((a, b) => a.matchNumber - b.matchNumber);
            var ourNextUpMatch = matches.filter(match => match.results.finished == false && match.teams.find(t => t.team == teamNumber))[0];
            var nextUpMatch = matches.filter(match => match.results.finished == false)[0];
            if(ourNextUpMatch == undefined){
                document.getElementById("matchNumber").innerHTML = "No more matches";
                document.getElementById("matchStart").innerHTML = "";
                document.getElementById("redTeams").innerHTML = "";
                document.getElementById("blueTeams").innerHTML = "";

                return;
            }

            nextUpMatchNumber = ourNextUpMatch.matchNumber;


            document.getElementById("matchNumber").innerHTML = "Match " + ourNextUpMatch.matchNumber;
            document.getElementById("matchStart").innerHTML = new Date(ourNextUpMatch.planned).toLocaleTimeString();
            document.getElementById("matchCurrent").innerHTML = "Field on Match " + (nextUpMatch.matchNumber + 1);

            var ourColor = ourNextUpMatch.teams.find(t => t.team == teamNumber).color;

            var redHTML = "";
            var blueHTML = "";

            ourNextUpMatch.teams.forEach(t => {
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

            document.getElementById("redTeams").innerHTML = redHTML;
            document.getElementById("blueTeams").innerHTML = blueHTML;
            document.getElementById("analysisButtons").style.display = "";


        });
    });
}



function openAnalysis(color){
    window.location = "/analysis?automatic=yes&color=" + color + "&matchNumber=" + nextUpMatchNumber + "&analysis=" + analysis;
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