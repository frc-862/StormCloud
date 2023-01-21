var overlaySaveData = {};
var overlaySaveFunction = ()=>{};

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

function stripIds(schema){
    schema.forEach(function(section){
        delete section._id;
        section.Components.forEach(function(component){
            delete component._id;
        });
    });
    return schema;
}

currentlySelectedSchema = "";

function generateIds(schema){
    schema.forEach(function(section){
        section._id = Math.random().toString(36).substring(7);
        section.Components.forEach(function(component){
            component._id = Math.random().toString(36).substring(7);
        });
    });
    return schema;
}

function showQrCode(){
    document.querySelector("#overlayClose").style.display = "none";
    document.querySelector("#overlayContent").innerHTML = `<div class="flex_center" style="width:100%"><div style="background-color:#ffffff;padding:10px;border-radius:8px;inline-block;text-align:center;width:500px"><div id="overlay_qrcode"></div></div></div>`;

    document.querySelector("#overlayTitle").innerHTML = "QR Code";



    var qrObj = {
        type: "config",
        serverAddress: window.location.host
    }


    var string = JSON.stringify(qrObj);


    var qrcode = new QRCode(document.querySelector("#overlay_qrcode"), {
        text: string,
        width: 500,
        height: 500,
        colorDark : "#190024",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });

    document.querySelector("#overlay").style.display = "";

    overlaySaveFunction = ()=>{
        document.querySelector("#overlay").style.display = "none";
    };
}

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

function loadSchemas(){
    get("/api/schemas", {}, function(success, data){
        console.log(success);
        if(success){
            document.querySelector("#overlayClose").style.display = "";
            document.querySelector("#overlayContent").innerHTML = `<div id="overlay_schemas" style="max-height:50vh"></div>`;

            var index = 0;
            data["schemas"].forEach(function(schema){
                var date = "Sometime...";
                if(schema["Updated"] != undefined){
                    date = new Date(schema["Updated"]).toLocaleString();
                }
                document.querySelector("#overlay_schemas").innerHTML += `
                <div class="flex_apart" style="margin:5px">
                    <div class="container level2bg flex_apart clickable overlay_selectSchema" data-id="${index}" style="margin:5px">
                        <span class="text regular">${schema.Name}</span>
                        <span class="text regular">${date}</span>
                    </div>
                   
                </div>
                    

                `;
                index++;
            });

            overlaySaveData["schemas"] = data["schemas"];
            overlaySaveData["currentSchema"] = undefined;

            overlaySaveFunction = ()=>{
                if(overlaySaveData["currentSchema"] != undefined){
                    currentlySelectedSchema = overlaySaveData["schemas"][overlaySaveData["currentSchema"]]["Name"];
                    sections = overlaySaveData["schemas"][overlaySaveData["currentSchema"]]["Parts"];
                    cached = generateIds(sections);
                    document.querySelector("#overlay").style.display = "none";
                    reshowSections();
                }
            }

            Array.from(document.querySelectorAll(".overlay_selectSchema")).forEach(function(element){
                element.addEventListener("click", function(e){
                    var index = element.dataset.id;

                    if(overlaySaveData["currentSchema"] != undefined){
                        var oldElement = document.querySelector(`.overlay_selectSchema[data-id="${overlaySaveData["currentSchema"]}"]`);
                        oldElement.style.backgroundColor = "";
                    }

                    element.style.backgroundColor = "#680991";
                    overlaySaveData["currentSchema"] = parseInt(index);
                });
            });

            document.querySelector("#overlayTitle").innerHTML = "Select Schema";
            document.querySelector("#overlay").style.display = "";
        }
    });
}


function loadSchemaData(){
    var name = prompt("Name of the schema to load");
    get("/api/schema?name=" + name, {}, function(success, data){
        if(success){
            sections = data["schema"]["Parts"];
            cached = sections;
            showQrCode();
            reshowSections();
        }else{
            alert("Error loading schema data");
        }
    
    })
}

function saveSchemaData(){

    document.querySelector("#overlayClose").style.display = "";
    document.querySelector("#overlayTitle").innerHTML = "Save Schema As";
    document.querySelector("#overlayContent").innerHTML = `
    
    <div class="flex_center">
        <input class="input small" value="${currentlySelectedSchema}" id="overlay_saveAs" type="text" placeholder="Schema Name" style="width:60%;display:inline-block"/>
    </div>
    `;
    document.querySelector("#overlay").style.display = "";

    overlaySaveFunction = ()=>{
        var name = document.querySelector("#overlay_saveAs").value;
        if(name == ""){
            alert("Please enter a name");
            return;
        }
        var data = stripIds(sections);
        post("/api/schema", {}, {name: name, data: data}, function(success, data){
            cached = data;
            showQrCode();
            if(!success){
                alert("Error saving schema data");
            }else{
                
            }
        });
    }

    
}

var cached = [];

var sections = [];

function editItem(element, field, sectionId){
    var _id = element.dataset.id;
    var index = sections.findIndex(s => s._id == sectionId);
    var itemIndex = sections[index].Components.findIndex(i => i._id == _id);
    var value = element.value;
    if(field == "Options" || field == "ColumnLabels" || field == "RowLabels"){
        var options = value.split(";");
        sections[index].Components[itemIndex][field] = options;
        return;
    }
    if(field == "Max" || field == "Min" || field == "Default"){
        value = parseInt(value);
        sections[index].Components[itemIndex][field] = value;
        return;
    }
    sections[index].Components[itemIndex][field] = value;
}

function moveItem(element, direction, sectionId){
    var _id = element.dataset.id;
    var index = sections.findIndex(s => s._id == sectionId);

    var itemIndex = sections[index].Components.findIndex(i => i._id == _id);
    if((direction == 1 && itemIndex < sections[index].Components.length - 1) || (direction == -1 && itemIndex > 0)){
        var temp = sections[index].Components[itemIndex];
        sections[index].Components[itemIndex] = sections[index].Components[itemIndex + direction];
        sections[index].Components[itemIndex + direction] = temp;
        reshowItems(sectionId);
    }
    
}

function deleteItem(element, section){
    var _id = element.dataset.id;
    var index = sections.findIndex(s => s._id == section);
    var itemIndex = sections[index].Components.findIndex(i => i._id == _id);
    sections[index].Components.splice(itemIndex, 1);
    reshowItems(section);
}

function addItem(element, type){
    var _id = element.dataset.id;
    var index = sections.findIndex(s => s._id == _id);
    var item = {
        Name: "",
        Type: type,
        _id: Math.random().toString(36).substring(7)
    }

    switch(type){
        case "Step":
            item.Max = 0;
            item.Min = 0;
            item.Default = 0;
            break;
        case "Label":
            item.Contents = "";
            break;
        case "Check":
            item.On = "";
            item.Off = "";
            break;
        case "Select":
            item.Options = [];
            break;
        case "Event":
            item.Trigger = "";
            item.Max = 0;
            break;
        case "Grid":
            item.Width = 1;
            item.Height = 1;
            item.ColumnLabels = [];
            item.RowLabels = [];

            break;
        case "Timer":
            item.Max = 0;
            break;
    }

    sections[index].Components.push(item);
    reshowItems(_id);
}

function editSection(element, field){
    var _id = element.dataset.id;
    var index = sections.findIndex(s => s._id == _id);
    var value = element.value;
    if(field == "Time"){
        value = parseInt(value);
    }
    sections[index][field] = value;
}

function deleteSection(element){
    var _id = element.dataset.id;
    var index = sections.findIndex(s => s._id == _id);
    sections.splice(index, 1);
    reshowSections();
}

function addSection(){
    var section = {
        Name: "",
        _id: Math.random().toString(36).substring(7),
        Time: 0,
        Components: []
    }
    sections.push(section);
    reshowSections();
}

function moveSection(element, direction){
    var _id = element.dataset.id;
    var index = sections.findIndex(s => s._id == _id);
    if((direction == 1 && index < sections.length - 1) || (direction == -1 && index > 0)){
        var temp = sections[index];
        sections[index] = sections[index + direction];
        sections[index + direction] = temp;
        reshowSections();
    }
    
}

function reshowSections(){
    document.getElementById("sections").innerHTML = "";
    sections.forEach(s => {
        document.getElementById("sections").innerHTML += `
            <div class="level1bg container" style="width:80%;display:inline-block;margin:10px" data-id="${s._id}">
                <div class="flex_apart" style="margin:10px 0px 20px 0px">
                    <div style="width:40%;text-align:left">
                        <span class="text caption" style="margin: 5px 10px;text-align:left">Section Name</span>
                        <input class="input small" value="${s.Name}" data-id="${s._id}" onchange="editSection(this, 'Name')" type="text" placeholder="Points" style="width:90%;display:inline-block"/>
                        
                    </div>
                    
                    <div style="width:20%">
                        <span class="text caption" style="margin: 5px 10px;text-align:left">Time Start (sec)</span>
                        <input class="input small" value="${s.Time}" data-id="${s._id}" onchange="editSection(this, 'Time')" type="number" placeholder="0" style="width:90%"/>
                        
                    </div>
                    <div class="flex_apart" style="width:10%;justify-content:right">
                        <div class="container level2bg clickable" style="padding: 10px;margin:5px;width:50px" data-id="${s._id}" onclick="moveSection(this, -1)">
                            <span class="text regular material-symbols-rounded">arrow_upward</span>
                        </div>
                        <div class="container level2bg clickable" style="padding: 10px;margin:5px;width:50px" data-id="${s._id}" onclick="moveSection(this, 1)">
                            <span class="text regular material-symbols-rounded">arrow_downward</span>
                        </div>
                        <div class="container redbg clickable" style="padding: 10px;margin:5px;width:50px" data-id="${s._id}" onclick="deleteSection(this)">
                            <span class="text regular material-symbols-rounded">close</span>
                        </div>
                    </div>
                </div>

                <div class="flex_center" style="margin:10px 0px">
                    <div class="level2bg container clickable" style="padding: 10px;margin:0px 5px" data-id="${s._id}" onclick="addItem(this, 'Step')">
                        <span class="text caption">+ Stepper</span>
                    </div>
                    <div class="level2bg container clickable" style="padding: 10px;margin:0px 5px" data-id="${s._id}" onclick="addItem(this, 'Check')">
                        <span class="text caption">+ Toggle</span>
                    </div>
                    <div class="level2bg container clickable" style="padding: 10px;margin:0px 5px" data-id="${s._id}" onclick="addItem(this, 'Select')">
                        <span class="text caption">+ Dropdown</span>
                    </div>
                    <div class="level2bg container clickable" style="padding: 10px;margin:0px 5px" data-id="${s._id}" onclick="addItem(this, 'Event')">
                        <span class="text caption">+ Event</span>
                    </div>
                    <div class="level2bg container clickable" style="padding: 10px;margin:0px 5px" data-id="${s._id}" onclick="addItem(this, 'Timer')">
                        <span class="text caption">+ Timer</span>
                    </div>
                    <div class="level2bg container clickable" style="padding: 10px;margin:0px 5px" data-id="${s._id}" onclick="addItem(this, 'Grid')">
                        <span class="text caption">+ Grid</span>
                    </div>
                    <div class="level2bg container clickable" style="padding: 10px;margin:0px 5px" data-id="${s._id}" onclick="addItem(this, 'Label')">
                        <span class="text caption">+ Text Label</span>
                    </div>
                </div>

                
                <div style="margin: 10px 0px;" class="items" data-id="${s._id}">
                    
                </div>
                
                
                
            </div>
        `
        reshowItems(s._id);
    })
}

function reshowItems(sectionId){
    var items = sections.find(s => s._id == sectionId).Components;
    var contentElement = document.querySelector(".items[data-id='" + sectionId + "']");
    contentElement.innerHTML = "";

    items.forEach(i => {
        switch(i.Type){
            case "Step":
                contentElement.innerHTML += `
                <div class="level2bg container flex_apart" style="margin:5px 0px">
                    
                    <div style="width:20%">
                        <span class="text caption" style="margin: 5px 10px;text-align:left">Stepper Label</span>
                        <input class="input small" type="text" value="${i.Name}" placeholder="Points" data-id="${i._id}" onchange="editItem(this, 'Name', '${sectionId}')"/>
                    </div>

                    <div style="width:40%" class="flex_apart">
                        <div style="width:30%;text-align:left">
                            <span class="text caption" style="margin: 5px 10px;text-align:left">Min</span>
                            <input class="input small" value="${i.Min}" style="display: inline-block;width:80px;text-align:center" type="number" placeholder="0" data-id="${i._id}" onchange="editItem(this, 'Min', '${sectionId}')"/>
                        </div>
                        <div style="width:30%;text-align:left">
                            <span class="text caption" style="margin: 5px 10px;text-align:left">Default</span>
                            <input class="input small" value="${i.Default}" style="display: inline-block;width:80px;text-align:center" type="number" placeholder="0" data-id="${i._id}" onchange="editItem(this, 'Default', '${sectionId}')"/>
                        </div>
                        <div style="width:30%;text-align:left">
                            <span class="text caption" style="margin: 5px 10px;text-align:left">Max</span>
                            <input class="input small" value="${i.Max}" style="display: inline-block;width:80px;text-align:center" type="number" placeholder="0" data-id="${i._id}" onchange="editItem(this, 'Max', '${sectionId}')"/>
                        </div>
                        
                    </div>

                    <div class="flex_apart" style="width:10%;justify-content:right">
                        <div class="container primarybg clickable" style="padding: 10px;margin:5px;width:50px" data-id="${i._id}" onclick="moveItem(this, -1, '${sectionId}')">
                            <span class="text regular material-symbols-rounded">arrow_upward</span>
                        </div>
                        <div class="container primarybg clickable" style="padding: 10px;margin:5px;width:50px" data-id="${i._id}" onclick="moveItem(this, 1, '${sectionId}')">
                            <span class="text regular material-symbols-rounded">arrow_downward</span>
                        </div>
                        <div class="container redbg clickable" style="padding: 10px;margin:5px;width:50px" data-id="${i._id}" onclick="deleteItem(this, '${sectionId}')">
                            <span class="text regular material-symbols-rounded">close</span>
                        </div>
                    </div>
                </div>
                `;
                break;
            case "Label":
                contentElement.innerHTML += `
                <div class="level2bg container flex_apart" style="margin:5px 0px">
                    
                    <div style="width:30%">
                        <span class="text caption" style="margin: 5px 10px;text-align:left">Static Label</span>
                        <input class="input small" style="width:100%" type="text" value="${i.Name}" placeholder="Title (not required)" data-id="${i._id}" onchange="editItem(this, 'Name', '${sectionId}')"/>
                    </div>

                    <div style="width:50%" class="flex_apart">
                        <div style="width:90%;text-align:left">
                            <span class="text caption" style="margin: 5px 10px;text-align:left">Extra Text</span>
                            <input class="input small" value="${i.Contents}" style="display: inline-block;text-align:left;width:100%" type="text" placeholder="Contents" data-id="${i._id}" onchange="editItem(this, 'Contents', '${sectionId}')"/>
                        </div>
                        
                        
                    </div>

                    <div class="flex_apart" style="width:10%;justify-content:right">
                        <div class="container primarybg clickable" style="padding: 10px;margin:5px;width:50px" data-id="${i._id}" onclick="moveItem(this, -1, '${sectionId}')">
                            <span class="text regular material-symbols-rounded">arrow_upward</span>
                        </div>
                        <div class="container primarybg clickable" style="padding: 10px;margin:5px;width:50px" data-id="${i._id}" onclick="moveItem(this, 1, '${sectionId}')">
                            <span class="text regular material-symbols-rounded">arrow_downward</span>
                        </div>
                        <div class="container redbg clickable" style="padding: 10px;margin:5px;width:50px" data-id="${i._id}" onclick="deleteItem(this, '${sectionId}')">
                            <span class="text regular material-symbols-rounded">close</span>
                        </div>
                    </div>
                </div>
                `;
                break;
            case "Check":
                contentElement.innerHTML += `
                    <div class="level2bg container flex_apart" style="margin:5px 0px">
                        
                        <div style="width:20%">
                            <span class="text caption" style="margin: 5px 10px;text-align:left">Toggle Label</span>
                            <input class="input small" value="${i.Name}" type="text" placeholder="Jumped?" data-id="${i._id}" onchange="editItem(this, 'Name', '${sectionId}')"/>
                        </div>

                        <div style="width:40%" class="flex_apart">
                            <div style="width:50%;text-align:left">
                                <span class="text caption" style="margin: 5px 10px;text-align:left">Value for OFF</span>
                                <input class="input small" value="${i.Off}" style="display: inline-block;width:160px" type="text" placeholder="No" data-id="${i._id}" onchange="editItem(this, 'Off', '${sectionId}')"/>
                            </div>
                            <div style="width:50%;text-align:left">
                                <span class="text caption" style="margin: 5px 10px;text-align:left">Value for ON</span>
                                <input class="input small" value="${i.On}" style="display: inline-block;width:160px" type="text" placeholder="Yes" data-id="${i._id}" onchange="editItem(this, 'On', '${sectionId}')"/>
                            </div>
                            
                            
                        </div>
    
                        <div class="flex_apart" style="width:10%;justify-content:right">
                            <div class="container primarybg clickable" style="padding: 10px;margin:5px;width:50px" data-id="${i._id}" onclick="moveItem(this, -1, '${sectionId}')">
                                <span class="text regular material-symbols-rounded">arrow_upward</span>
                            </div>
                            <div class="container primarybg clickable" style="padding: 10px;margin:5px;width:50px" data-id="${i._id}" onclick="moveItem(this, 1, '${sectionId}')">
                                <span class="text regular material-symbols-rounded">arrow_downward</span>
                            </div>
                            <div class="container redbg clickable" style="padding: 10px;margin:5px;width:50px" data-id="${i._id}" onclick="deleteItem(this, '${sectionId}')">
                                <span class="text regular material-symbols-rounded">close</span>
                            </div>
                        </div>
                    </div>
                    `;
                break;
            case "Select":
                var optionsString = "";
                i.Options.forEach(o => {
                    optionsString += o + ";";
                });
                optionsString = optionsString.slice(0, -1);
                contentElement.innerHTML += `
                    <div class="level2bg container flex_apart" style="margin:5px 0px">
                        
                        <div style="width:20%">
                            <span class="text caption" style="margin: 5px 10px;text-align:left">Dropdown Label</span>
                            <input class="input small" value="${i.Name}" type="text" placeholder="Level Achieved" data-id="${i._id}" onchange="editItem(this, 'Name', '${sectionId}')"/>
                        </div>

                        <div style="width:40%" class="flex_apart">
                            <div style="width:100%;text-align:left">
                                <span class="text caption" style="margin: 5px 10px;text-align:left">Options (separate by ";")</span>
                                <input class="input small" value="${optionsString}" style="display: inline-block;width:400px" type="text" placeholder="Yes;No" data-id="${i._id}" onchange="editItem(this, 'Options', '${sectionId}')"/>
                            </div>
                            
                            
                        </div>
    
                        <div class="flex_apart" style="width:10%;justify-content:right">
                            <div class="container primarybg clickable" style="padding: 10px;margin:5px;width:50px" data-id="${i._id}" onclick="moveItem(this, -1, '${sectionId}')">
                                <span class="text regular material-symbols-rounded">arrow_upward</span>
                            </div>
                            <div class="container primarybg clickable" style="padding: 10px;margin:5px;width:50px" data-id="${i._id}" onclick="moveItem(this, 1, '${sectionId}')">
                                <span class="text regular material-symbols-rounded">arrow_downward</span>
                            </div>
                            <div class="container redbg clickable" style="padding: 10px;margin:5px;width:50px" data-id="${i._id}" onclick="deleteItem(this, '${sectionId}')">
                                <span class="text regular material-symbols-rounded">close</span>
                            </div>
                        </div>
                    </div>
                    `;
                break;
            case "Event":
                contentElement.innerHTML += `
                    <div class="level2bg container flex_apart" style="margin:5px 0px">
                        
                        <div style="width:20%">
                            <span class="text caption" style="margin: 5px 10px;text-align:left">Event Label</span>
                            <input class="input small" value="${i.Name}" type="text" placeholder="Exploded" type="text" placeholder="BOOM!" data-id="${i._id}" onchange="editItem(this, 'Name', '${sectionId}')"/>
                        </div>

                        <div style="width:40%" class="flex_apart">
                            <div style="width:60%;text-align:left">
                                <span class="text caption" style="margin: 5px 10px;text-align:left">Event Button Text</span>
                                <input class="input small" value="${i.Trigger}" style="display: inline-block;width:200px" type="text" placeholder="BOOM!" data-id="${i._id}" onchange="editItem(this, 'Trigger', '${sectionId}')"/>
                            </div>
                            <div style="width:40%;text-align:left">
                                <span class="text caption" style="margin: 5px 10px;text-align:left">Max Times</span>
                                <input class="input small" value="${i.Max}" style="display: inline-block;width:120px" type="number" placeholder="0" data-id="${i._id}" onchange="editItem(this, 'Max', '${sectionId}')"/>
                            </div>
                            
                            
                        </div>
    
                        <div class="flex_apart" style="width:10%;justify-content:right">
                            <div class="container primarybg clickable" style="padding: 10px;margin:5px;width:50px" data-id="${i._id}" onclick="moveItem(this, -1, '${sectionId}')">
                                <span class="text regular material-symbols-rounded">arrow_upward</span>
                            </div>
                            <div class="container primarybg clickable" style="padding: 10px;margin:5px;width:50px" data-id="${i._id}" onclick="moveItem(this, 1, '${sectionId}')">
                                <span class="text regular material-symbols-rounded">arrow_downward</span>
                            </div>
                            <div class="container redbg clickable" style="padding: 10px;margin:5px;width:50px" data-id="${i._id}" onclick="deleteItem(this, '${sectionId}')">
                                <span class="text regular material-symbols-rounded">close</span>
                            </div>
                        </div>
                    </div>
                    `;
                break;
            case "Grid":
                contentElement.innerHTML += `
                    <div class="level2bg container flex_apart" style="margin:5px 0px">
                        
                        <div style="width:20%">
                            <span class="text caption" style="margin: 5px 10px;text-align:left">Grid Label</span>
                            <input class="input small" value="${i.Name}" type="text" placeholder="Areas Placed" data-id="${i._id}" onchange="editItem(this, 'Name', '${sectionId}')"/>
                        </div>

                        <div style="width:40%" class="flex_apart">
                            <div style="width:30%;text-align:left">
                                <span class="text caption" style="margin: 5px 10px;text-align:left">Width</span>
                                <input class="input small" value="${i.Width}" style="display: inline-block;width:160px" type="number" placeholder="1" data-id="${i._id}" onchange="editItem(this, 'Width', '${sectionId}')"/>

                                <span class="text caption" style="margin: 5px 10px;text-align:left">Column Labels</span>
                                <input class="input small" value="${i.ColumnLabels}" style="display: inline-block;width:160px" type="number" placeholder="1" data-id="${i._id}" onchange="editItem(this, 'ColumnLabels', '${sectionId}')"/>
                            </div>
                            <div style="width:30%;text-align:left">
                                <span class="text caption" style="margin: 5px 10px;text-align:left">Height</span>
                                <input class="input small" value="${i.Height}" style="display: inline-block;width:160px" type="number" placeholder="1" data-id="${i._id}" onchange="editItem(this, 'Height', '${sectionId}')"/>

                                <span class="text caption" style="margin: 5px 10px;text-align:left">Row Labels</span>
                                <input class="input small" value="${i.RowLabels}" style="display: inline-block;width:160px" type="number" placeholder="1" data-id="${i._id}" onchange="editItem(this, 'RowLabels', '${sectionId}')"/>
                            </div>
                            <div style="width:30%;text-align:left">
                                <span class="text caption" style="margin: 5px 10px;text-align:left">Linked Group (optional)</span>
                                <input class="input small" value="${i.Group}" style="display: inline-block;width:160px" type="text" placeholder="BLUEGRID" data-id="${i._id}" onchange="editItem(this, 'Group', '${sectionId}')"/>
                            </div>
                            
                            
                        </div>
    
                        <div class="flex_apart" style="width:10%;justify-content:right">
                            <div class="container primarybg clickable" style="padding: 10px;margin:5px;width:50px" data-id="${i._id}" onclick="moveItem(this, -1, '${sectionId}')">
                                <span class="text regular material-symbols-rounded">arrow_upward</span>
                            </div>
                            <div class="container primarybg clickable" style="padding: 10px;margin:5px;width:50px" data-id="${i._id}" onclick="moveItem(this, 1, '${sectionId}')">
                                <span class="text regular material-symbols-rounded">arrow_downward</span>
                            </div>
                            <div class="container redbg clickable" style="padding: 10px;margin:5px;width:50px" data-id="${i._id}" onclick="deleteItem(this, '${sectionId}')">
                                <span class="text regular material-symbols-rounded">close</span>
                            </div>
                        </div>
                    </div>
                    `;
                break;
            case "Timer":
                contentElement.innerHTML += `
                    <div class="level2bg container flex_apart" style="margin:5px 0px">
                        
                        <div style="width:20%">
                            <span class="text caption" style="margin: 5px 10px;text-align:left">Timer Label</span>
                            <input class="input small" value="${i.Name}" type="text" placeholder="Disabled" data-id="${i._id}" onchange="editItem(this, 'Name', '${sectionId}')"/>
                        </div>

                        <div style="width:40%" class="flex_apart">
                            <div style="width:100%;text-align:left">
                                <span class="text caption" style="margin: 5px 10px;text-align:left">Max Seconds (0 for infinite)</span>
                                <input class="input small" value="${i.Max}" style="display: inline-block;width:120px" type="number" placeholder="0" data-id="${i._id}" onchange="editItem(this, 'Max', '${sectionId}')"/>
                            </div>
                            
                            
                        </div>
    
                        <div class="flex_apart" style="width:10%;justify-content:right">
                            <div class="container primarybg clickable" style="padding: 10px;margin:5px;width:50px" data-id="${i._id}" onclick="moveItem(this, -1, '${sectionId}')">
                                <span class="text regular material-symbols-rounded">arrow_upward</span>
                            </div>
                            <div class="container primarybg clickable" style="padding: 10px;margin:5px;width:50px" data-id="${i._id}" onclick="moveItem(this, 1, '${sectionId}')">
                                <span class="text regular material-symbols-rounded">arrow_downward</span>
                            </div>
                            <div class="container redbg clickable" style="padding: 10px;margin:5px;width:50px" data-id="${i._id}" onclick="deleteItem(this, '${sectionId}')">
                                <span class="text regular material-symbols-rounded">close</span>
                            </div>
                        </div>
                    </div>
                    `;
                break;
        }
    });
}




reshowSections();

function changeInput(evt){
    // need the input tag name, the value, and the id
}