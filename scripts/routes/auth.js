var express = require('express');
var router = express.Router();
var db = require('../database.js');
var authTools = require('../tools/authHelper.js');
const bodyParser = require('body-parser');


let environment = "test";


/**
 * @api {get} /auth/validate Validate your device ID
 * @apiName GET Validate
 * @apiGroup Auth
 */

router.post("/validate/device", async (req, res) => {
    var joinKey = req.body.key;
    
    var env = (await db.getDocs("Environment", {friendlyId: environment}));
    if(env.length == 0){
        res.status(500).json({message: "No environment found!"});
    }

    var deviceId = req.body.deviceId;
    if(deviceId == undefined){
        res.status(403).json({message: "No device ID provided!"});
    }

    

    var role = env.access.find(role => role.joinKey == joinKey);
    if(role){
        res.status(200).json({success: true, access: role});

        if(authTools.checkDeviceExists(deviceId, env)){
            // Device already exists
            env.devices.find(device => device.deviceId == deviceId).latestRole = role._id;
            env.devices.find(device => device.deviceId == deviceId).latestAccess = new Date();
        }else{
            env.devices.push({
                generatedId: deviceId,
                latestRole: role._id,
                latestAccess: new Date()
            });
        }

        return;
    }
    await db.updateDoc("Environment", {_id: env._id}, {devices: env.devices});
    res.status(403).json({success: false, message: "Invalid join key"});
});


