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

var currentAnalysis = {
    Name: "",
    Updated: "",
    Parts: [],
    Schema: {
        id: "",
        Name: ""
    }
};

var multiselectComponents = {};

var environmentData = {};
var settings = {};
var schemas = [];

function initialize(){
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

function addComponent(){
    var newComponent = {
        Name: "",
        Type: itemType,
        Data: {},
        _id: Math.random().toString(36).substring(7)
    };
    currentAnalysis.Parts.push(newComponent);


    document.getElementById("items").appendChild(createComponent(newComponent));


    refreshComponentOrder();
    updateComponent(newComponent._id);
}

function createComponent(component){
    var partSpecificHTML = "";

    switch(component.Type){
        case "Number":
            partSpecificHTML = `
            
                <div>
                
                </div>
            `;
            break;
    }
}

function updateComponent(id){
    var component = currentAnalysis.Parts.find((part) => part.id == id);


}

function moveComponent(id, direction){
    var index = currentAnalysis.Parts.findIndex((part) => part.id == id);
    var newIndex = index + direction;
    if(newIndex < 0 || newIndex >= currentAnalysis.Parts.length){
        return;
    }
    var temp = currentAnalysis.Parts[index];
    currentAnalysis.Parts[index] = currentAnalysis.Parts[newIndex];
    currentAnalysis.Parts[newIndex] = temp;
    refreshComponentOrder();
}

function refreshComponentOrder(){
    var allCurrentItems = document.getElementById("items").children;
    var refreshedOrder = document.createDocumentFragment();

    currentAnalysis.Parts.forEach((part) => {
        var item = Array.from(allCurrentItems).find(i => i.getAttribute("data-id") == part.id);
        refreshedOrder.appendChild(item);
    });

    document.getElementById("items").innerHTML = "";
    document.getElementById("items").appendChild(refreshedOrder);
}

