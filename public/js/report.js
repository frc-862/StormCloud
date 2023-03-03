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





function getMatchAnalysis(){

    get('/api/quick/matches?teamNumber=' + team, {}, function(success, data){

        var fHTML = "";
        fHTML += `
        <div class="flex_center">
            <span class="header" style="color:#190024;margin-bottom:20px">Matches for ${team}</span>
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
            <div class="flex_apart" style="margin:10px"> 
            `;

            mHTML += `
            <span class="important" style="color:#190024">Match ${match.matchNumber}</span>
            `

            var redTeams = match.teams.filter(t => t.color == "Red");
            var blueTeams = match.teams.filter(t => t.color == "Blue");

            var redHTML = ``;
            var blueHTML = ``;

            
            redTeams.forEach(function(t){

                redHTML += `
                <div class="redbg container flex_center" style="margin:5px; padding:5px; border-radius:12px;width:100px">
                    <span class="important" style="color:white">${t.team == team ? `<u>${t.team}</u>` : `${t.team}`}</span>
                </div>
                `;
            });
            blueTeams.forEach(function(t){
                blueHTML += `
                <div class="bluebg container flex_center" style="margin:5px; padding:5px; border-radius:12px;width:100px">
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

                mHTML += `
                <div class="${redScore > blueScore ? "redbg" : "bluebg"} container" style="margin:10px; padding:10px; border-radius:12px;width:120px">
                    <div class="flex_center">
                        <span class="important" style="color:white">${redScore} - ${blueScore}</span>
                    </div>
                    <div class="flex_center">
                        <span class="regular" style="color:white">${redScore > blueScore ? "Red" : "Blue"} Wins</span>
                    </div>
                    
                    
                </div>
                `
            }else{
                mHTML += `
                <div class="whitebg container flex_center" style="margin:10px; padding:10px; border-radius:12px;width:120px">
                    <span class="important" style="color:black">${match.matchNumber - prevMatch.matchNumber} Matches</span>
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
