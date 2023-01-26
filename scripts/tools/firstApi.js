var db = require('../database.js');
const parser = require('body-parser')
const crypto = require('crypto');
const JWT = require('jsonwebtoken');
const dotenv = require('dotenv');
const axios = require('axios');

function getAuthToken(){
    return "Basic " + process.env.FRC_API;
}

function getBaseApiUrl(){
    return "https://" + process.env.COMP_TYPE + "-api.firstinspires.org/v3.0";
}

async function testConnectivity(){

    // go to base season data

    try{
        var res = await axios.get(getBaseApiUrl() +  "/2022", {headers: {"Authorization":getAuthToken()}});
    }catch(e){
        return false;
    }
    

    console.log(res.data);
    console.log(res.status);

    return res.status == 200;
}

async function getSchedule(year, competition, phase){
    try{
        var res = await axios.get(getBaseApiUrl() +  `/${year}/schedule/${competition}?tournamentLevel=${phase}`, {headers: {"Authorization":getAuthToken()}});
    }catch(e){
        return {error:e};
    }
    res.data["status"] = res.status;
    return res.data;
    
}

async function getTeams(year, competition){
    try{
        var res = await axios.get(getBaseApiUrl() +  `/${year}/teams?eventCode=${competition}`, {headers: {"Authorization":getAuthToken()}});
    }catch(e){
        return {error:e};
    }
    res.data["status"] = res.status;
    return res.data;
}

async function getMatchResults(year, competition, phase){
    try{
        var res = await axios.get(getBaseApiUrl() +  `/${year}/scores/${competition}/${phase}`, {headers: {"Authorization":getAuthToken()}});
    }catch(e){
        return {error:e};
    }

    res.data["status"] = res.status;
    return res.data;
}

module.exports = {
    testConnectivity: testConnectivity,
    getSchedule: getSchedule,
    getTeams: getTeams,
    getMatchResults: getMatchResults
}