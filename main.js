const fs = require('fs');
const ytdl = require('ytdl-core');
var path = require("path");
var request = require('request');
var SpotifyWebApi = require('spotify-web-api-node');
var youtube = require('youtube-search');
const context = require('audio-context')
const Generator = require('audio-generator')
const {Readable, Writable} = require('web-audio-stream/stream')
var express = require('express');
var app = express();



var client_id = 'e5f7c755748b463cab7dcf25b83b017d'; // Your client id
var client_secret = '8e569197dae149dc83e9f6add1fcc94e'; // Your secret
var redirect_uri = 'http://localhost:3000/callback'; // Your redirect uri
// credentials are optional
var spotifyApi = new SpotifyWebApi({
    clientId: client_id,
    clientSecret: client_secret,
    redirectUri: redirect_uri
});


var send_error = function (res) {
    var response = {};
    response.status = "error";
    res.setHeader('Content-Type', 'application/json');
    res.send(response);
    return;
};


var startTime = [-1, 0];
var diff = [-1, 0];
var expires_in;
var token;
var refresh_token;

var get_access_token = function (callback) {
    if (startTime[0] != -1) {
        diff = process.hrtime(startTime);
    }
    if (diff[0] == -1 || diff[0]-startTime[0] <= expires_in) {
        refresh_access_token(callback);
    }
    else callback(false);
};

var refresh_access_token = function (callback) {
    // your application requests authorization
    var authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        headers: {
            'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
        },
        form: {
            grant_type: 'client_credentials'
        },
        json: true
    };
    startTime = process.hrtime();
    request.post(authOptions, function (error, response, body) {
        if (!error && response.statusCode === 200) {

            // use the access token to access the Spotify Web API
            token = body.access_token;
            expires_in = body.expires_in;
            refresh_token = body.refresh_token;
            spotifyApi.setAccessToken(token);
            callback(error)
        }

    });
};



// respond with "hello world" when a GET request is made to the homepage
app.get('/', function(req, res) {
   res.sendFile(path.join(__dirname+'/view/home.html'));
});


app.get('/find/:query', function(req, res) {
    console.log(req.params);
    if (req.params.query===undefined) res.send("empty");
    else{
        get_access_token(function (err) {
        if (err) {
            send_error(res);
        }
            spotifyApi.searchTracks(req.params.query)
            .then(function(data) {
                res.send(data.body);
            }, function(err) {
                console.error(err);
            });
        });
    }
});

app.get('/play/:artist/:track', function(req, res) {
    if(req.params.artist!==undefined && req.params.track!==undefined){
        var opts = {
            maxResults: 5,
            key: 'AIzaSyBIwPuprTOyxZlZaZWIym4vQnSNlF8ABU8'
        };
        var query = req.params.artist +" "+req.params.track;
        console.log(query);
        youtube(query, opts, function(err, results) {
            if(err) return console.log(err);
            var id = results[0].id;
            var url="http://www.youtube.com/watch?v="+id;
            var stream = ytdl(url,{quality: 'highestaudio', filter: 'audioonly'});
            console.log("stream music");
            stream.pipe(fs.createWriteStream('audio.mp3'))
            stream.on('finish', function () {
                console.log("finish");
                // var range = req.headers.range;
                // const stats = fs.statSync("audio.mp3")
                // var total = stats.size;
                // var parts = range.replace(/bytes=/, "").split("-");
                // var partialstart = parts[0];
                // var partialend = parts[1];
                //
                // var start = parseInt(partialstart, 10);
                // var end = partialend ? parseInt(partialend, 10) : total;
                // var chunksize = (end-start);
                // res.writeHead(206, {
                //     "Content-Range": "bytes " + start + "-" + end + "/" + total,
                //     "Accept-Ranges": "bytes",
                //     "Content-Length": chunksize,
                //     "Content-Type": "audio/ogg"
                // });
                // res.sendFile(__dirname+"/audio.mp3")
            });
            stream.pipe(res);

        });

    }

});



app.listen(3000);
console.log("Start server");
