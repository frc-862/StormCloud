var {firebase} = require("./firebaseIntegration.js");

function sendNotificationAll(title, body, data, topic){
    var message = {
        notification: {
            title: title,
            body: body
        },
        topic: topic
    }
    if(data){
        message.data = data;
    }
    firebase.messaging().send(message).then(function(response){
        console.log("Successfully sent message:", response);
    });

}

module.exports = {
    sendNotificationAll: sendNotificationAll
}