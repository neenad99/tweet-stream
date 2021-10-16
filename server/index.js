const http = require('http');
const path = require('path');
const socketIo = require('socket.io');
const express = require('express');
const needle = require('needle');
const config = require('dotenv').config();


const TOKEN = process.env.TWITTER_BEARER_TOKEN;
const port = process.env.PORT || 3000;

const rulesUrl = 'https://api.twitter.com/2/tweets/search/stream/rules';
const streamUrl = 'https://api.twitter.com/2/tweets/search/stream?tweet.fields=public_metrics&expansions=author_id';

const rules = [{value: 'coding'}];


const app = express();

//to use websockets

const server = http.createServer(app);
const io = socketIo(server);

app.get('/',(req,res)=>{
    res.sendFile(path.resolve(__dirname,'../','client','index.html'))
})

// get stream rules

async function getRules(){
    const response = await needle('get',rulesUrl,{
        headers:{
            Authorization : `Bearer ${TOKEN}`,
        },
    });

    console.log(response.body);

    return response.body;
}

//set stream rules 

async function setRules(){
    const data = {
        add: rules,
    }

    const response = await needle('post',rulesUrl,data,{
        headers:{
            'Content-Type' : 'application/json',
            Authorization : `Bearer ${TOKEN}`
        }
    });

    
    return response.body;
}

//delete stream rules 

async function deleteRules(rules){
    if(!Array.isArray(rules.data)){
        return null;
    }

    const ids = rules.data.map((rule)=>rule.id);
   
    const data = {
        delete: {
            ids:ids
        }
    }

    const response = await needle('post',rulesUrl,data,{
        headers:{
            'Content-Type' : 'application/json',
            Authorization : `Bearer ${TOKEN}`
        }
    });

    
    return response.body;
}

function streamTweets(socket){
    const stream = needle.get(streamUrl,{
        headers:{
            Authorization: `Bearer ${TOKEN}`
        }
    });

    stream.on('data',(data)=>{
        try{
            const json = JSON.parse(data);
            // console.log(json);
            socket.emit('tweets',json);
        }
        catch(err){

        }
    })
}

io.on('connection',async () => {
    console.log('client connected');

    let currentRules;

    try{
        currentRules = await getRules();

        await deleteRules(currentRules);

        await setRules();


    }catch(err){
        console.log(err);
        process.exit(1);
    }

    streamTweets(io);
})


server.listen(port,()=>{
    console.log(`server listening on port ${port}`);
});