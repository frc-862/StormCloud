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

document.querySelector("#setup").addEventListener("click", function(e){
    var password = document.querySelector("#key").value;
    var confirm = document.querySelector("#keyConfirm").value;

    if(password == "" || confirm == ""){
        document.querySelector("#key").style.border = "2px solid red";
        document.querySelector("#keyConfirm").style.border = "2px solid red";
        return;
    }

    if(password != confirm){
        document.querySelector("#keyConfirm").style.border = "2px solid red";
        return;
    }

    post("/api/environment/setup", {}, {password: password}, function(success, data){
        window.location = "/";
    });
});

document.querySelector("#key").addEventListener("keyup", function(e){
    document.querySelector("#key").style.border = "";
    document.querySelector("#keyConfirm").style.border = "";
});

document.querySelector("#keyConfirm").addEventListener("keyup", function(e){
    document.querySelector("#key").style.border = "";
    document.querySelector("#keyConfirm").style.border = "";
});