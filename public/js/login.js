function readFromCookie(name){
    var result = document.cookie.match(new RegExp(name + '=([^;]+)'));
    result && (result = result[1]);
    return result;
}

function writeToCookie(name, value){
    

    document.cookie = name + "=" + value

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

function generateDeviceId(){
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 5; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}


document.querySelector("#login").addEventListener("click", function(e){
    var key = document.querySelector("#key").value;
    document.querySelector("#login").disabled = true;
    if(key == ""){
        
        document.querySelector("#key").style.borderColor = "red";
        return;
    }

    var deviceId = generateDeviceId();

    post("/auth/validate/device", {}, {joinKey: key, deviceId: deviceId}, function(success, data){
        if(success){
            writeToCookie("token", data.token);

            window.location = "/";
        }else{
            post("/auth/validate/password", {}, {password: key}, function(success, data){
                if(success){
                    writeToCookie("token", data.token);

                    window.location = "/";
                }else{
                    document.querySelector("#login").disabled = false;
                    document.querySelector("#key").style.borderColor = "red";
                }
            
            });
        }
    });



});

document.querySelector("#key").addEventListener("keyup", function(e){
    var key = document.querySelector("#key").value;
    if(key.length == 0){
        document.querySelector("#login").disabled = true;
        document.querySelector("#key").style.border = "2px solid red";

    }else{
        document.querySelector("#login").disabled = false;
        document.querySelector("#key").style.border = "";
    }
});