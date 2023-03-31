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

function goToMatchAnalysis(match, color){
    window.location.href = `/analysis?automatic=yes&matchNumber=${match}&color=${color}`;
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

        var ourUpcomingMatch = matches.filter(m => m.results.finished == false)[0];

        var n = 0;
        matches.forEach(function(match){

            var prevMatch = matches[matches.indexOf(match) - 1];
            if(prevMatch == undefined){
                prevMatch = {
                    matchNumber: 0
                };
            }

            var mHTML = `
            <div class="flex_apart${fan == "yes" ? " container" : ""}" style="margin:20px 10px;padding:20px 40px;${fan == "yes" ? "border-radius:16px;background-color:rgba(0,0,0,0.5);" : (ourUpcomingMatch.matchNumber == match.matchNumber ? "border-radius:16px;background-color:#e4a6ff" : "")}"> 
            `;

            if(n == 0){
                mHTML += `
                <div>
                <span class="important" style="color:${textColor};display:block">Match ${match.matchNumber}</span>
                <span class="regular" style="color:${textColor};display:block">${(new Date(match.planned)).toLocaleTimeString('en-US', {timeZone: 'UTC'})}</span>
                </div>
                
                `
            }else{
                mHTML += `
                <div>
                <span class="important" style="color:${textColor};display:block">Match ${match.matchNumber} <span class="caption">(+${matches[n-1].matchNumber})</span></span>
                <span class="regular" style="color:${textColor};display:block">${(new Date(match.planned)).toLocaleTimeString('en-US', {timeZone: 'UTC'})}</span>
                </div>
                
                `
            }
            

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
                <div class="${redScore > blueScore ? "redbg" : (redScore == blueScore ? "primarybg":"bluebg")} container" style="margin:10px; padding:10px; border-radius:12px;width:160px;${winner == ourTeam.color ? (fan == "yes" ? "border: 2px solid white" : "border: 4px solid #1ffa1b") : "border: 2px solid transparent"}">
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
                <div class="whitebg container flex_center" style="margin:10px; padding:10px; border-radius:12px;width:160px${ourUpcomingMatch.matchNumber == match.matchNumber ? ";background-color:#b61bfa" : ""}" onclick="goToMatchAnalysis(${match.matchNumber}, '${ourTeam.color}')">
                    <span class="important" style="color:white">${ourUpcomingMatch.matchNumber == match.matchNumber ? "Up Next!" : "Not Played"}</span>
                </div>
                `
            }


            

            mHTML += `</div>`;


            fHTML += mHTML;
            n++;
        });
        fHTML += `</div>`;
        document.getElementById("report").innerHTML = fHTML;
    });
}
getMatchAnalysis();

setInterval(function(){
    getMatchAnalysis();
}, 30000);