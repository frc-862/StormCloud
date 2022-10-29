var db = require('../database.js');
const parser = require('body-parser')
const crypto = require('crypto');
const JWT = require('jsonwebtoken');
const dotenv = require('dotenv');

function generateAuthToken(level, permissions, username, environment){
    return JWT.sign({
        level: level,
        permissions: permissions,
        username: username,
        environment: environment
    }, process.env.JWT_SECRET, {expiresIn: "7d"});
}

async function authorize(token, permission, env){
    var decoded = await checkToken(token);
    if(decoded == undefined){
        return false;
    }
    if(decoded.environment != env.friendlyId){
        return false;
    }
    return checkForPermission(permission, decoded.permissions);
}

async function checkToken(token){
    try{
        var decoded = JWT.verify(token, process.env.JWT_SECRET);
        return decoded;
    }catch(err){
        return undefined;
    }
}

function checkForPermission(permission, permissions){
    if(permissions.includes("*")){
        return true;
    }
    return permissions.includes(permission);
}

async function getEnvironment(environment){
    var env = (await db.getDocs("Environment", {friendlyId: environment}));
    if(env.length == 0){
        return undefined;
    }
    return env[0];
}

async function checkDeviceExists(deviceId, env){
    var device = env.devices.find(device => device.generatedId == deviceId);
    return device != undefined;
}

async function getDevice(deviceId, env){
    var device = env.devices.find(device => device.generatedId == deviceId);
    return device;
}


function isEnvironmentSetup(env){
    
    if(env.master == undefined || env.master.hash == undefined){
        return false;
    }
    return true;
}


async function checkPassword(password, env){
    if(env.master == undefined || env.master.hash == undefined){
        return false;
    }
    var hash = crypto.pbkdf2Sync(password, env.master.salt, env.master.iterations, 512, 'sha512').toString('hex');
    return hash == env.master.hash;
}

async function setMasterPassword(previousPassword, password, env){

    var newMaster = {};
    
    if(isEnvironmentSetup(env) && !(await checkPassword(previousPassword, env))){
        console.log("Environment setup");
        console.log(isEnvironmentSetup(env));
        return false;
    }
    newMaster["salt"] = crypto.randomBytes(128).toString('hex');
    newMaster["iterations"] = 10000;
    newMaster["hash"] = crypto.pbkdf2Sync(password, newMaster.salt, newMaster["iterations"], 512, 'sha512').toString('hex');
    await db.updateDoc("Environment", {_id: env._id}, {master: newMaster});
    return true;
}


module.exports = {
    checkDeviceExists: checkDeviceExists,
    getDevice: getDevice,
    isEnvironmentSetup: isEnvironmentSetup,
    setMasterPassword: setMasterPassword,
    checkPassword: checkPassword,
    generateAuthToken: generateAuthToken,
    getEnvironment: getEnvironment,
    checkToken: checkToken,
    checkForPermission: checkForPermission,
    authorize: authorize
};