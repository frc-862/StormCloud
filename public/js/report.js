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


const urlParams = new URLSearchParams(window.location.search);
var team = urlParams.get('teamNumber');
if(team == null || team == undefined){
    team = prompt("Please enter a team number to get the match analysis for");
}
var fan  = urlParams.get('fan');
if(fan == null || fan == undefined){
    fan = "no";
}

var textColor = fan == "yes" ? "white" : "#190024";
if(fan == "yes"){
    document.body.style.backgroundColor = "transparent";
    document.querySelector("html").style.backgroundColor = "#323996";
    document.querySelector("html").style.backgroundImage = "linear-gradient(90deg, #20256b 0%, #323996 100%)";
    document.querySelector("html").style.backgroundRepeat = "no-repeat";
    document.querySelector("html").style.backgroundSize = "cover";
    

}





function getMatchAnalysis(){

    get('/api/quick/matches?teamNumber=' + team, {}, function(success, data){

        var fHTML = "";
        fHTML += `
        <div class="flex_center">
            <span class="header" style="color:${textColor};margin-bottom:20px">Matches for ${team}</span>
        </div>
        `;

        var matches = data["matches"];
        matches.sort((a, b) => parseInt(a.matchNumber) - parseInt(b.matchNumber));

        matches.forEach(function(match){

            var prevMatch = matches[matches.indexOf(match) - 1];
            if(prevMatch == undefined){
                prevMatch = {
                    matchNumber: 0
                };
            }

            var mHTML = `
            <div class="flex_apart${fan == "yes" ? " container" : ""}" style="${fan == "yes" ? "margin:10px;padding:20px 40px;border-radius:16px;background-color:rgba(0,0,0,0.5);" : ""}"> 
            `;

            mHTML += `
            <span class="important" style="color:${textColor}">Match ${match.matchNumber}</span>
            `

            var redTeams = match.teams.filter(t => t.color == "Red");
            var blueTeams = match.teams.filter(t => t.color == "Blue");

            var ourTeam = match.teams.filter(t => t.team == team)[0];

            var redHTML = ``;
            var blueHTML = ``;

            
            redTeams.forEach(function(t){

                redHTML += `
                <div class="redbg container flex_center" style="margin:5px; padding:5px; border-radius:12px;width:100px;${t.team == team ? "border: 2px solid white" : "border:2px solid transparent"}">
                    <span class="important" style="color:white">${t.team == team ? `<u>${t.team}</u>` : `${t.team}`}</span>
                </div>
                `;
            });
            blueTeams.forEach(function(t){
                blueHTML += `
                <div class="bluebg container flex_center" style="margin:5px; padding:5px; border-radius:12px;width:100px;${t.team == team ? "border: 2px solid white" : "border:2px solid transparent"}">
                    <span class="important" style="color:white">${t.team == team ? `<u>${t.team}</u>` : `${t.team}`}</span>
                </div>
                `;
            });
            mHTML += `
            <div>
                <div class="flex_center">
                ${redHTML}
                </div>
                <div class="flex_center">
                ${blueHTML}
                </div>
            </div>
            
            `
            if(match.results.finished){
                var redScore = match.results.red;
                var blueScore = match.results.blue;

                var winner = redScore > blueScore ? "Red" : (redScore == blueScore ? "Tie" : "Blue");

                mHTML += `
                <div class="${redScore > blueScore ? "redbg" : (redScore == blueScore ? "primarybg":"bluebg")} container" style="margin:10px; padding:10px; border-radius:12px;width:160px;${winner == ourTeam.color ? "border: 2px solid white" : "border: 2px solid transparent"}">
                    <div class="flex_center">
                        <span class="important" style="color:white">${redScore} - ${blueScore}</span>
                    </div>
                    <div class="flex_center">
                        <span class="regular" style="color:white">${redScore > blueScore ? "Red Wins" : (redScore == blueScore ? "It's a Tie!":"Blue Wins")}</span>
                    </div>
                    
                    
                </div>
                `
            }else{
                mHTML += `
                <div class="whitebg container flex_center" style="margin:10px; padding:10px; border-radius:12px;width:160px">
                    <span class="important" style="color:white">Not Played</span>
                </div>
                `
            }


            

            mHTML += `</div>`;


            fHTML += mHTML;
        });
        fHTML += `</div>`;
        document.getElementById("report").innerHTML = fHTML;
    });
}
getMatchAnalysis();

setInterval(function(){
    getMatchAnalysis();
}, 30000);