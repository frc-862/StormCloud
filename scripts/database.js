const mongoose = require('mongoose');


/* 

    Permissions:

    READ_ALL
    READ_PICKLIST
    ASSOCIATE
    WRITE_DATA
    WRITE_PAPER
    WRITE_EXTRA
    WRITE_PICKLIST
    EDIT_ALL
    DELETE_ALL
    SETTINGS
    

*/

const models = {
    'Environment' : mongoose.model('Environment', new mongoose.Schema({
        name: String,
        friendlyId: String,
        compIds: [String],
        settings: {
            teamsPerColor: Number,
            teamsPerAlliance: Number,
            selectedSchema: String,
            currentSync: String,
            competitionCode: String,
            competitionYear: Number,
            minBuild: Number,
            team: Number,
            matchType: String,
            defaultAnalysis: String
        },
        master: {
            hash: String,
            salt: String,
            iterations: Number
        },
        access: [{
            role: String,
            joinKey: String,
            permissions: [String]
        }],
        devices: [{
            generatedId: String,
            latestRole: String,
            latestAccess: String
        }],
        cachedCompetitionData: {
            rankings: [{
                team: Number,
                rank: Number,
                rankingPoints: Number,
                tiebreaker: Number,
                matchesPlayed: Number,
                record: {
                    wins: Number,
                    losses: Number,
                    ties: Number
                }
            }],
            currentMatch: Number,
            updated: Date,
            competitionName: String,
            location: String
        }
    })),
    'Match' : mongoose.model('Match', new mongoose.Schema({
        environment: String,
        competition: String,
        matchNumber: Number,
        description: String,
        matchType: String,
        teams: [{
            team: Number,
            color: String
        }],
        locked: Boolean,
        planned: Date,
        documents: [String],
        results:{
            finished: Boolean,
            red: Number,
            redStats: Object,
            blue: Number,
            blueStats: Object,
        }
    })),
    //michael was here
    'Team' : mongoose.model('Team', new mongoose.Schema({
        teamNumber: Number,
        environment: String,
        name: String,
        notes: [String],
        extraData: {
            record: {
                wins: Number,
                losses: Number,
                ties: Number
            },
            comps: [String]
        }
    })),
    'Document' : mongoose.model('Document', new mongoose.Schema({
        environment: String,
        dataType: String,
        json: String,
        datetime: Date,
        image: String,
        competition: String,
        name: String,
        flagged: Boolean
    })),
    'Schema' : mongoose.model('Schema', new mongoose.Schema({
        Name: String,
        Updated: Date,
        Parts: [Object],
        Settings: Object
    })),
    'AnalysisSet' : mongoose.model('AnalysisSet', new mongoose.Schema({
        Name: String,
        Updated: Date,
        Parts: [Object],
        Schema: {
            Name: String,
            Type: String
        },
        environment: String
    }))
}

async function init(pw){
    await mongoose.connect(process.env.DB, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to mongodb');

    
    
    

    

}

async function testAddData(){
    var envs = await getDocs('Environment', {friendlyId: 'test'});
    if(envs.length == 0){
        // obsolete db object
        await createDoc('Environment', {name: 'Comp Environment', team: 0, friendlyId: 'test', compIds: ["mi_test_1"], settings: {teamsPerColor: 3, teamsPerAlliance: 3, competitionCode: "MIMIL", competitionYear: 2022}, access: []});
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