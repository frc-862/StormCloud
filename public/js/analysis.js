var overlaySaveData = {};
var overlaySaveFunction = ()=>{};

var environmentData = {};

function generateUUID(){
    var dt = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (dt + Math.random()*16)%16 | 0;
        dt = Math.floor(dt/16);
        return (c=='x' ? r :(r&0x3|0x8)).toString(16);
    });
    return uuid;
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
    Parts: []
};



function refreshAnalysisSet(){
    document.querySelector("#items").innerHTML = "";
    var fHTML = "";
    currentAnalysisSet.Parts.forEach((part) => {
        var partHTML = "";

        switch(part.Type){
            case "Number":
                partHTML = `
                <div class="flex_center" style="width:100%">
                    <span class="text small" style="margin: 5px 10px;text-align:left">Interpret Final Number</span>
                    <select value="${part.Data["Stat_Final"]}" class="input text important setting" style="margin:10px;width:50%;pointer-events:all" onchange="setData('${part._id}', 'Stat_Final', this)">
                        <option value="sum" ${part.Data["Stat_Final"] == "sum" ? "selected": ""}>Total Sum</option>
                        <option value="avg" ${part.Data["Stat_Final"] == "avg" ? "selected": ""}>Total Average</option>
                    </select>
                </div>
                <div class="flex_center" style="width:100%">
                    <span class="text small" style="margin: 5px 10px;text-align:left">Combine Data Points</span>
                    <select value="${part.Data["Stat_Between"]}" class="input text important setting" style="margin:10px;width:50%;pointer-events:all" onchange="setData('${part._id}', 'Stat_Between', this)">
                        <option value="sum" ${part.Data["Stat_Between"] == "sum" ? "selected": ""}>Sum Of...</option>
                        <option value="avg" ${part.Data["Stat_Between"] == "avg" ? "selected": ""}>Average Of...</option>
                        <option value="max" ${part.Data["Stat_Between"] == "max" ? "selected": ""}>Maximum Of...</option>
                        <option value="min" ${part.Data["Stat_Between"] == "min" ? "selected": ""}>Minimum Of...</option>
                        <option value="range" ${part.Data["Stat_Between"] == "range" ? "selected": ""}>Range Of...</option>
                    </select>
                </div>
                <div class="flex_center" style="width:100%">
                    
                    <select class="input text important setting" style="margin:10px;width:80%;pointer-events:all" multiple>
                        
                    </select>
                </div>
                
                `

                break;
            case "Grid":
                partHTML = `
               
                
                `;
            case "Graph":
                partHTML = `
                
                
                `;
            case "FIRST":
                partHTML = `
                
                
                `;
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
}

refreshAnalysisSet();

function setName(item, elem){
    var index = currentAnalysisSet.Parts.indexOf(currentAnalysisSet.Parts.find(i => i._id == item));
    currentAnalysisSet.Parts[index].Name = elem.value;
    

}

function setData(item, dataPoint, elem){
    var index = currentAnalysisSet.Parts.indexOf(currentAnalysisSet.Parts.find(i => i._id == item));
    currentAnalysisSet.Parts[index].Data[dataPoint] = elem.value;
    refreshAnalysisSet();
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

    currentAnalysisSet.Parts.push(item);
    refreshAnalysisSet();
}

