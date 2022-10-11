const mongoose = require('mongoose');


const models = {
    'Environment' : mongoose.model('Environment', new mongoose.Schema({
        name: String,
        friendlyId: String,
        team: Number,
        compIds: [String],
        settings: {
            teamsPerColor: Number,
            teamsPerAlliance: Number
        },
        access: [{
            role: String,
            username: String,
            passwordHash: String,
            passwordSalt: String,
            passwordIterations: Number
        }]
    })),
    'Match' : mongoose.model('Match', new mongoose.Schema({
        environment: String,
        competition: String,
        matchNumber: Number,
        teams: [{
            team: Number,
            color: String
        }],
        locked: Boolean,
        planned: Date,
        documents: [String]
    })),
    'Team' : mongoose.model('Team', new mongoose.Schema({
        environment: String,
        teamNumber: Number,
        name: String,
        documents: [String]
    })),
    'Document' : mongoose.model('Document', new mongoose.Schema({
        environment: String,
        dataType: String,
        json: String,
        datetime: Date,
        image: String
    }))
}

async function init(pw){
    await mongoose.connect('mongodb+srv://Daviado:' + pw + '@stormcloud.yxon7lk.mongodb.net/?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to mongodb');

    
    
    

    

}

async function testAddData(){
    var envs = await getDocs('Environment', {friendlyId: 'test'});
    if(envs.length == 0){
        await createDoc('Environment', {name: 'Testing Environment', team: 0, friendlyId: 'test', compIds: ["mi_test_1"], settings: {teamsPerColor: 3, teamsPerAlliance: 3}, access: []});
    }

    var matches = await getDocs('Match', {environment: 'test'});
    if(matches.length == 0){
        await createDoc('Match', {environment: 'test', competition: 'mi_test_1', matchNumber: 1, teams: [{team: 10, color: 'red'}, {team: 20, color: 'red'}, {team: 30, color: 'red'}, {team: 40, color: 'blue'}, {team: 50, color: 'blue'}, {team: 60, color: 'blue'}], locked: false, planned: new Date(), documents: []});
    }

    var teams = await getDocs('Team', {environment: 'test'});
    if(teams.length == 0){
        await createDoc('Team', {environment: 'test', teamNumber: 10, name: 'Team 10', documents: []});
        await createDoc('Team', {environment: 'test', teamNumber: 20, name: 'Team 20', documents: []});
        await createDoc('Team', {environment: 'test', teamNumber: 30, name: 'Team 30', documents: []});
        await createDoc('Team', {environment: 'test', teamNumber: 40, name: 'Team 40', documents: []});
        await createDoc('Team', {environment: 'test', teamNumber: 50, name: 'Team 50', documents: []});
        await createDoc('Team', {environment: 'test', teamNumber: 60, name: 'Team 60', documents: []});
    }

}

async function createDoc(type, data){
    var doc = new models[type](data);
    await doc.save();
    return doc;
}

async function getDocs(type, query){
    return await models[type].find(query);
}

async function updateDoc(type, query, data){
    await models[type].updateOne(query, {$set: data});
    return await getDocs(type, query);
}

async function deleteDoc(type, query){
    await models[type].deleteOne(query);
    return true;
}

module.exports = {
    init,createDoc,getDocs,updateDoc,deleteDoc, testAddData
}