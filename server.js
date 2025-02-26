import express from "express";
import axios from "axios";
import cors from "cors";
import { nanoid } from "nanoid";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import { MongoClient, ServerApiVersion }from "mongodb";


const port = process.env.PORT || 8000;
const id = process.env.MYANIMELIST_ID;
const uri = process.env.MYANIMELIST_REDIRECT_URI;
const secret = process.env.MYANIMELIST_SECRET;
const app = express();

app.use(cors());
app.use(cookieParser(process.env.COOKIE_SECRET));

const client = new MongoClient(process.env.MONGODB_URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      deprecationErrors: true,
    }
});

//update every 24 hours: setInterval(() => setDailyAnime(),1000 * 60 * 60 * 24);


const setDailyAnime = async () => {
    try{
        try{
            await client.connect();
        }catch(err){
            console.log("error: ",  err);
            return;
        }

        const updateDoc = {
            $set: {
                usedForToday: false
            },
        };

       

        let currentDay = await client.db('Anime-Guesser').collection('AnimeList').findOne({usedForToday: true});
        
        const findYesturday = await client.db('Anime-Guesser').collection('AnimeList').updateOne({usedForToday: true}, updateDoc);
        
        

        
        let findAnime = true;
        let buffer = [];
        while(findAnime){
            const randomNumber= crypto.randomInt(1, 4001);
            if(!buffer.find((e) => e === randomNumber)){
                const findNew = await client.db('Anime-Guesser').collection('AnimeList').findOne({rank: randomNumber});
                if(findNew.usedForDaily !== true){
                    const setNew = await client.db('Anime-Guesser').collection('AnimeList').updateOne({rank: findNew.rank}, {
                        $set: {
                            usedForDaily: true,
                            usedForToday: true,
                            dayNumber: currentDay.dayNumber + 1
                        },
                    });
                    console.log("setnew ", setNew);
                    findAnime = false;
                }
            }
        }
        
        console.log("find yesturday, ", findYesturday);
        //console.log("setnew ", setNew);
        
        
    }finally{
        
    }
}




const getDailyAnime = async () => {
    let findDaily;
    try{
        try{
            await client.connect();
        }catch(err){
            console.log("error: ",  err);
            return;
        }
        findDaily = await client.db('Anime-Guesser').collection('AnimeList').findOne({usedForToday: true});
        if ((await client.db('Anime-Guesser').collection('AnimeList').countDocuments({usedForToday: true})) === 0) {
            console.log("reponse, ");
        }

        console.log("response, ", findDaily);
    }finally{
        console.log("*farts nasty big green stink bubble* finally ... peace at last");
        
    }
    return findDaily;
}



const addField = async () => {
    try{
        try{
            await client.connect();
        }catch(err){
            console.log("error: ",  err);
            return;
        }

        const updateDoc = {
            $set: {
                usedForDaily: false,
                usedForToday: false
            },
        };
        
        const response = await client.db('Anime-Guesser').collection('AnimeList').updateMany({}, updateDoc);
        console.log("response ", response);
        
    }finally{
        await client.close();
    }
    
}

const addToDatabase = async (data) =>{
    try{
        try{
            await client.connect();
        }catch(err){
            console.log("error: ",  err);
            return;
        }
        const options = { ordered: true};
        const response = await client.db('Anime-Guesser').collection('AnimeList').insertMany(data, options);
        console.log("response ", response);
    }finally{
        await client.close();
    }
}

const filterAnime = (data) => {
    let buffer = [];
    for(let x = 0; x < data.length; x++){
        if(data[x].node.media_type !== "Music"){
            buffer.push(data[x].node);
        }
    }
    return buffer;
}

function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
}

app.get('/', (req, res) =>{
    res.send('hello world');
});

app.get('/getArchive', async (req, res) => {
    try{
        try{
            await client.connect();
        }catch(err){
            console.log("error: ",  err);
            return;
        }

        const options = {
            sort: { dayNumber: 1 },
        }
      
        const response = await client.db('Anime-Guesser').collection('AnimeList').find({dayNumber: {$exists: true}}, options).toArray();
        console.log("response Archive ", response);
        res.json(response);
    }finally{
        await client.close();
    }
    
});

app.get('/getArchiveByDay', async (req, res) => {
    try{
        try{
            await client.connect();
        }catch(err){
            console.log("error: ",  err);
            return;
        }
        const { day } = req.query;
        
        const response = await client.db('Anime-Guesser').collection('AnimeList').findOne({dayNumber: parseInt(day)})
        console.log("response Archive ", response);
        res.json(response);
    }finally{
        await client.close();
    }
    
});


app.get('/setDailyAnime', async (req, res) => {
    const daily = await setDailyAnime();
    res.json(daily);
});

app.get('/getDailyAnime', async (req, res) => {
    const daily = await getDailyAnime();
    res.json(daily);
});

app.get('/deleteAll', async (req, res) => {
    try{
        try{
            await client.connect();
        }catch(err){
            console.log("error: ",  err);
            return;
        }
      
        const response = await client.db('Anime-Guesser').collection('AnimeList').deleteMany({});
        console.log("response ", response);
        res.send("it hurtz so bed");
    }finally{
        await client.close();
    }
});

app.get('/deleteRelatedAnime', async (req, res) => {
    try{
        try{
            await client.connect();
        }catch(err){
            console.log("error: ",  err);
            return;
        }
      
        const response = await client.db('Anime-Guesser').collection('AnimeList').updateMany({}, {$unset: {related_anime:[]}});
        console.log("response ", response);
        res.send("its gone its dead");
    }finally{
        await client.close();
    }
});


app.get('/findSome', async (req, res) => {
    try{
        try{
            await client.connect();
        }catch(err){
            console.log("error: ",  err);
            return;
        }
        //const query = { popularity: { $lt: 980 } };

        const options = {
        sort: { popularity: 1 },
        projection: { _id: 0, id: 1, title: 1, popularity: 1, related_anime: 1 },

        };
        const response = await client.db('Anime-Guesser').collection('AnimeList').find({}, options).toArray();
        for(let x = 0; x < response.length; x++){
            for(let y = 0; y < response.length; y++){
                if(response[x].popularity === response[y].popularity && response[x].id !== response[y].id){
                    console.log("SEEE: ", response[x]);
                }
            }
        }
        //console.log("response ", response);
        res.json(response);
    }finally{
        await client.close();
    }
});





app.get('/search', async (req, res) => {
    
    const { query } = req.query;
    
    try{

        try{
            await client.connect();
        }catch(err){
            console.log("error: ",  err);
            return;
        }
        console.log("query: ", query );
      
        
        const filter = {
            $or:[
                {title:{$regex: `${query}`, $options:"i"}},
                {"alternative_titles.en":{$regex: `${query}`, $options:"i"}},
                {title:{$regex: `^${query}`, $options:"i"}},
                {"alternative_titles.en":{$regex: `^${query}`, $options:"i"}},
                {"alternative_titles.synonyms":{$in:[query]}}
            ]
        };

        
        
        const response = await client.db('Anime-Guesser').collection('AnimeList').find(filter).sort({popularity:1}).toArray();
        if ((await client.db('Anime-Guesser').collection('AnimeList').countDocuments(filter)) === 0) {
            console.log("reponse, ", response);
        }
        console.log(response);
        res.status(200).json(response);
      
    }catch(err){
        res.status(400).send(`didn't work:  ${err}`);
    }  
 
});


//FIELDS: id,title,main_picture,alternative_titles,start_date,end_date,synopsis,mean,rank,popularity,media_type,status,genres,num_episodes,start_season,source,average_episode_duration,related_anime,popularity,rating,pictures,background,studios
app.get('/fillDataBase', (req, res) => {
    axios.get(`https://api.myanimelist.net/v2/anime/ranking?ranking_type=bypopularity&limit=500&offset=4000&fields=id,title,main_picture,alternative_titles,start_date,end_date,synopsis,mean,rank,popularity,media_type,status,genres,num_episodes,start_season,source,average_episode_duration,related_anime,popularity,rating,pictures,background,studios`, {
        headers:{
            "X-MAL-CLIENT-ID":id
        }
    }).then((response) => {
        const anime = filterAnime(response.data.data);
        addToDatabase(anime);
        res.json(anime);
    }).catch((err) => res.status(500).json({ err: err.message }));
});

app.get('/getById', async (req, res) => {

    try{
        try{
            await client.connect();
        }catch(err){
            console.log("error: ",  err);
            return;
        }
        
        for(let x = 4001; x <= 4000; x++){
            const response = await client.db('Anime-Guesser').collection('AnimeList').findOne({popularity: x});
            await axios.get(`https://api.myanimelist.net/v2/anime/${response.id}?fields=related_anime`, {
                headers:{
                    "X-MAL-CLIENT-ID":id
                }
            }).then(async (respo) => {
                const update = []
                for(let y = 0; y < respo.data.related_anime.length; y++){
                    if(await client.db('Anime-Guesser').collection('AnimeList').countDocuments({id: respo.data.related_anime[y].node.id}) !== 0){
                        update.push({node:{id: respo.data.related_anime[y].node.id, title: respo.data.related_anime[y].node.title}, relation_type:respo.data.related_anime[y].relation_type});
                    }
                }
                //console.log("puda, ", update);
                const updateDoc = {
                    $set: {
                        related_anime: update
                    },
                };
                await client.db('Anime-Guesser').collection('AnimeList').updateOne({id: response.id}, updateDoc)
            }).catch((err) => res.status(500).json({ err: err.message }));
           //left over at 3531
            await sleep(1000 * 8);
            console.log("asdf: ", x);
       }
       res.send("he");
    }finally{
        //await client.close();
    }    
    
});

app.get('/getAnime', async (req, res) => {
    const {id} = req.query;
    
    try{
        try{
            await client.connect();
        }catch(err){
            console.log("error: ",  err);
            return;
        }
        //console.log("id: ", id);
       
        const values = Object.entries(id).map(([key, value]) => {
            return value;
        });
        //console.log("yo mr white: ", values[1]);
         const response = [];
        for(let x = 0; x < values.length; x++){
            if(values[x] !== "Skip"){
                response.push(await client.db('Anime-Guesser').collection('AnimeList').findOne({id: parseInt(values[x], 10)}));
            }else{
                response.push("Skip");
            }
        }
        //console.log("yo jessie: ", response[0]);
        res.json(response);
    }finally{
        //await client.close();
    }

})

const recursiveFill = async (client, relatedAnime) => {
    if(relatedAnime.related_anime.length > 0){
        let buffer = {id:null, related_anime:[]};
        let globalIndexBuffer = [];
        
        for(let loopCount = 0; loopCount < relatedAnime.related_anime.length; loopCount++){
            const response = await client.db('Anime-Guesser').collection('AnimeList').findOne({id: relatedAnime.related_anime[loopCount].node.id});
            if(response.related_anime.length === 0){
                return buffer;
            }
            let indexBuffer = Array(response.related_anime.length).fill(true);
            
            
            for(let x = 0; x < response.related_anime.length; x++){
                for(let y = 0; y < relatedAnime.related_anime.length; y++){
                    if((relatedAnime.related_anime[y].node.id === response.related_anime[x].node.id) || (response.related_anime[x].node.id === relatedAnime.id)){
                        indexBuffer[x] = false;
                    }
                }
            }
            //console.log("here, ", response.id);
           
            for(let x = 0; x < response.related_anime.length; x++){
                //console.log("X: ", x);
                //console.log("yet1, ", response.related_anime[x].node.id);
                //console.log("indexBuffer: ", indexBuffer[x]);
                if(indexBuffer[x]){
                    //console.log("after count1, ", relatedAnime.id);
                    buffer.related_anime.push(response.related_anime[x]);
                    //console.log("after countnew, ", buffer); 
                    globalIndexBuffer.push(response.id);
                }         
            }
                 
        }
        
        for(let x = 0; x < buffer.related_anime.length; x++){
            for(let y = 0; y < buffer.related_anime.length; y++){
                if(buffer.related_anime[y] && buffer.related_anime[x]){
                    if(buffer.related_anime[x].node.id === buffer.related_anime[y].node.id && x !== y){
                    
                        delete buffer.related_anime[x];
                        delete globalIndexBuffer[x];
                    }   
                }
            }
        }
        let duplicateIndex = 0;
        let resetIndex = 0;
        while(duplicateIndex >= 0){
            if(buffer.related_anime[duplicateIndex] === undefined && duplicateIndex < buffer.related_anime.length){
                buffer.related_anime.splice(duplicateIndex, 1);
                globalIndexBuffer.splice(duplicateIndex, 1);
               // console.log("how it happen: ", duplicateIndex);
                
                resetIndex++;
            }

            if(duplicateIndex >= buffer.related_anime.length){
                duplicateIndex = -5;
            }
            duplicateIndex++;
            if(resetIndex > 0){
                duplicateIndex = 0;
                resetIndex = 0;
            }
        }
        
        //console.log("buffer as it stands, ", buffer.related_anime);
        //console.log("buffer length: ", buffer.related_anime.length);
        //console.log("END!!!!!!");
        //console.log("               ");
        
        const originalLength = buffer.related_anime.length;
        if(originalLength > 0){
            for(let x = 0; x < originalLength; x++){
                buffer.id = globalIndexBuffer[x]; //make sure there aren't repeat id's
                buffer.related_anime.push(...relatedAnime.related_anime);
                const newBuffer = await recursiveFill(client, buffer);
                if(newBuffer.related_anime.length > 0){
                    buffer.related_anime.push(...newBuffer.related_anime); 
                }
            }
        }
        for(let x = 0; x < buffer.related_anime.length; x++){
            for(let y = 0; y < buffer.related_anime.length; y++){
                if(buffer.related_anime[y] && buffer.related_anime[x]){
                    if(buffer.related_anime[x].node.id === buffer.related_anime[y].node.id && x !== y){
                        delete buffer.related_anime[x];
                    }
                }
            }
        }
        let finalBuffer = {related_anime: []};
        for(let x = 0; x < buffer.related_anime.length; x++){
            if(buffer.related_anime[x]){
                finalBuffer.related_anime.push(buffer.related_anime[x]);
            }
        } 

        return finalBuffer; 
       
    }else{
        return [];
    }  
}

app.get('/recursiveFill', async (req, res) => {
    try{
        try{
            await client.connect();
        }catch(err){
            console.log("error: ",  err);
            return;
        }
        for(let j = 4000; j <= 4000; j++){ 
            const response = await client.db('Anime-Guesser').collection('AnimeList').findOne({popularity: j});
            if(response.related_anime.length){
                const buffer = await recursiveFill(client, response);
                

                //615 isekia quartet
                //FINISHED
                /* THINGS TO DO:
                *   - ADD SEPERATE COLLECTION FOR ALREADY USED DAILY ANIME
                *   - ADD COOKIES TO REMEBER USER'S PREVIOUS GAMES/SCORE
                *   - STYLE NAVBAR, ADD ICONS, BETTER COLORS ETC.
                */   
                
                for(let x = 0; x < buffer.related_anime.length; x++){
                    for(let y = 0; y < response.related_anime.length; y++){
                        if(response.related_anime[y] && buffer.related_anime[x]){
                            if(buffer.related_anime[x].node.id === response.related_anime[y].node.id && x !== y){
                                delete buffer.related_anime[x];
                            }
                        }
                    }
                }

                let finalBuffer = {related_anime: []};
                for(let x = 0; x < buffer.related_anime.length; x++){
                    if(buffer.related_anime[x]){
                        finalBuffer.related_anime.push(buffer.related_anime[x]);
                    }
                } 
                console.log("number: ", j);
                await sleep(1000 * 5);
                //console.log("final buffer: ", finalBuffer);
                const update = await client.db('Anime-Guesser').collection('AnimeList').updateOne({popularity: j}, { $push: { related_anime: { $each: finalBuffer.related_anime } } })
            }
        }
        console.log("final buffer1: ", update);
        res.send(finalBuffer);
    }finally{
        await client.close();
    }
});

app.get('/addField', (req, res) => {
    addField();
    res.send("we did it");
});

//2AuthO
//Implemented for educational purposes
//NOT IN USE
app.get('/login', (req, res) =>{

    const stateParam = nanoid();

    res.cookie("stateParam", stateParam, {
        maxAge:1000*60*5,
        signed:true
    });

    function base64URLEncode(str) {
        return str.toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    let code_verifier = base64URLEncode(crypto.randomBytes(32));
    res.cookie("code_verifier", code_verifier, {
        maxAge:1000*60*5,
        signed:true
    });
      
    //code challenge accepted by myanimelist is "simple" thus code challenge and code verifier must be the same
    let code_challenge = code_verifier;

    const query = {
        response_type: "code",
        client_id: id,
        state: stateParam,
        redirect_uri: uri,
        code_challenge: code_challenge
    }
    const urlEncoded = new URLSearchParams(query).toString();

    res.redirect(`https://myanimelist.net/v1/oauth2/authorize?${urlEncoded}`);
});

app.get('/getToken', (req, res) =>{
    //Extracting code and state
    const { code, state } = req.query;
    
    //Extracting state parameter previously signed and stored in cookies
    const { stateParam, code_verifier } = req.signedCookies;
    
    
    //Comparing state parameters
    if (state !== stateParam) {
        //throwing unprocessable entity error
        res.status(422).send("Invalid State");
        return;
    }

    const body = {
        client_id: id,
        client_secret: secret,
        grant_type: process.env.MYANIMELIST_AUTHORIZATION_CODE,
        code: code,
        redirect_uri: uri,
        code_verifier: code_verifier
    };
    const opts = { 
        headers: { 
            "Content-Type": "application/x-www-form-urlencoded"
         } 
    };

    axios.post("https://myanimelist.net/v1/oauth2/token", body, opts)
    .then((_res) => _res.data.access_token)
    .then((token) => {
        res.redirect(process.env.CLIENT_URL);
    })
    .catch((err) => res.status(500).json({ err: err.message }));
});

app.listen(port, () => console.log(`Server is running on port ${port}`));