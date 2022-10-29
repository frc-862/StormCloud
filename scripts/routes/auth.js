var express = require('express');
var router = express.Router();
var db = require('../database.js');
var authTools = require('../tools/authHelper.js');
const bodyParser = require('body-parser');
const JWT = require('jsonwebtoken');


let environment = "test";




/**
 * @api {get} /auth/validate Validate your device ID
 * @apiName GET Validate
 * @apiGroup Auth
 */

router.post("/validate/key", async (req, res) => {
    var token = req.cookies.token;    
})

router.post('/validate/password', async (req, res) => {
    var password = req.body.password;

    var env = await authTools.getEnvironment(environment);
    if(env.length == 0){
        res.status(500).json({message: "No environment found!"});
        return;
    }

    var result = await authTools.checkPassword(password, env);

    if(result){
        var token = await authTools.generateAuthToken("master", ["*"], "Master User", env.friendlyId);
        res.status(200).json({token: token});
    }else{
        res.status(401).json({message: "Incorrect password!"});
    }
});

router.post("/validate/device", async (req, res) => {
    var joinKey = req.body.key;
    
    var env = await authTools.getEnvironment(environment);
    if(env.length == 0){
        res.status(500).json({message: "No environment found!"});
        return;
    }

    var deviceId = req.body.deviceId;
    if(deviceId == undefined){
        res.status(403).json({message: "No device ID provided!"});
        return;
    }

    

    var role = env.access.find(role => role.joinKey == joinKey);
    if(role){
        var token = await authTools.generateAuthToken("device", role.permissions, deviceId, env.friendlyId);


        res.status(200).json({success: true, access: role, token: token});

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


module.exports = router;