const fs = require('fs');
const ytdl = require('ytdl-core');
var path = require("path");
var request = require('request');
// var SpotifyWebApi = require('spotify-web-api-node'); //not used
var Spotify = require('node-spotify-api');
var youtube = require('youtube-search');
var lyric = require("lyric-get");
var ms = require('mediaserver');
const ffmpeg   = require('fluent-ffmpeg');
var express = require('express');
var app = express();




var client_id = 'e5f7c755748b463cab7dcf25b83b017d'; // Your client id
var client_secret = '8e569197dae149dc83e9f6add1fcc94e'; // Your secret
// var redirect_uri = 'http://localhost:3000/callback'; // Your redirect uri
// credentials are optional
// var spotifyApi = new SpotifyWebApi({
//     clientId: client_id,
//     clientSecret: client_secret,
//     redirectUri: redirect_uri
// });

var spotify = new Spotify({
    id:client_id,
    secret: client_secret
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

app.get('/track/:query', function(req, res) {
    console.log(req.params);
    if (req.params.query===undefined) res.send("empty");
    else{
        spotify.search({ type: 'track', query: req.params.query, limit:5 }, function(err, data) {
            if (err) {
                return console.log('Error occurred: ' + err);
                res.json("{error}");
            }
            res.json(data);
        });
    }
});
app.get('/artist/:query', function(req, res) {
    console.log(req.params);
    if (req.params.query===undefined) res.send("empty");
    else{
        spotify.search({ type: 'artist', query: req.params.query, limit:5 }, function(err, data) {
            if (err) {
                return console.log('Error occurred: ' + err);
                res.json("{error}");
            }
            res.json(data);
        });
    }
});
app.get('/album/:query', function(req, res) {
    console.log(req.params);
    if (req.params.query===undefined) res.send("empty");
    else{
        spotify.search({ type: 'album', query: req.params.query, limit:5 }, function(err, data) {
            if (err) {
                return console.log('Error occurred: ' + err);
                res.json("{error}");
            }
            res.json(data);
        });
    }
});

app.get('/tracks_of_album/:id', function(req, res) {
    console.log(req.params);
    if (req.params.id===undefined) res.send("empty");
    else{
        spotify
          .request('https://api.spotify.com/v1/albums/'+ req.params.id +'/tracks')
          .then(function(data) {
            res.json(data);
        })
        .catch(function(err) {
            console.error('Error occurred: ' + err);
          });
    }
});


app.get('/play/:query', function(req, res) {
    console.log(req.params.query);
    if(req.params.query!==undefined){
        var opts = {
            maxResults: 5,
            key: 'AIzaSyBIwPuprTOyxZlZaZWIym4vQnSNlF8ABU8'
        };
        var query = req.params.query;
        console.log(query);
        youtube(query, opts, function(err, results) {
            if(err) return console.log(err);
            var id = results[0].id;
            var url="http://www.youtube.com/watch?v="+id;
            var stream = ytdl(url,{quality: 'highestaudio'});
            console.log("stream music");
            // stream.pipe(fs.createWriteStream('audio.mp3'))
            stream.on('finish', function () {
                console.log("finish");
                // ms.pipe(req, res, __dirname+"/audio.mp3");
            });
            // stream.pipe(res);
            ffmpeg(stream)
            // .audioBitrate(128)
            .save(__dirname+'/audio.flac')
            .on('end', () => {
                console.log('convertito!');
                ms.pipe(req, res, __dirname+"/audio.flac");
            });

        });

    }

});

app.get('/lyric/:artist/:track', function(req, res){
    lyric.get(req.params.artist, req.params.track, function(err, data){
        if(err){
            console.log(err);
            var x={'lyric':''};
            res.json(x);
        }
        else{
            var r = {'lyric':data}
            res.json(r);
        }
    });
});

app.listen(3000);
console.log("Start server");



// app.get('/artist/:query', function(req, res) {
//     console.log(req.params);
//     if (req.params.query===undefined) res.send("empty");
//     else{
//         get_access_token(function (err) {
//         if (err) {
//             send_error(res);
//         }
//             spotifyApi.searchArtists(req.params.query, {limit:5})
//             .then(function(data) {
//                 var tracks=data.body.tracks
//                 res.json(tracks);
//             }, function(err) {
//                 console.error(err);
//             });
//         });
//     }
// });
//
// app.get('/album/:query', function(req, res) {
//     console.log(req.params);
//     if (req.params.query===undefined) res.send("empty");
//     else{
//         get_access_token(function (err) {
//         if (err) {
//             send_error(res);
//         }
//             spotifyApi.searchTracks(req.params.query, {limit:5, type: 'album'})
//             .then(function(data) {
//                 var tracks=data.body.tracks
//                 res.json(tracks);
//             }, function(err) {
//                 console.error(err);
//             });
//         });
//     }
// });
