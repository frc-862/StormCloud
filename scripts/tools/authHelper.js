var db = require('../database.js');
const parser = require('body-parser')
const crypto = require('crypto');

async function getEnvironment(){
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


async function isEnvironmentSetup(env){
    if(env.master == undefined || env.master.hash == undefined){
        return false;
    }
    return true;
}


async function checkPassword(password, env){
    if(env.master == undefined || env.master.hash == undefined){
        return false;
    }
    var hash = crypto.pbkdf2Sync(password, environmentObject.salt, environmentObject.iterations, 512, 'sha512').toString('hex');
    return hash == environmentObject.master.hash;
}

async function setMasterPassword(previousPassword, password, env){

    var newMaster = {};
    if(_isEnvironmentSetup(env) && !(await _checkPassword(previousPassword, env))){
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
    checkPassword: checkPassword
};