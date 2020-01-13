const express                   = require("express");
const cookieParser              = require('cookie-parser');
const app                       = express();
const bodyParser                = require('body-parser');
const server                    = app.listen(80, ()=>{console.log(`server started on port 80`)});
const io                        = require("socket.io")(server);
const EventEmitter              = require('events');
class MyEmitter extends EventEmitter {}
const myEmitter                 = new MyEmitter();
const crypto                    = require("crypto");
const multiplayer               = require("playingInit.js");
const timesyncServer            = require('timesync/server');
const { Pool }                  = require('pg');
const path                      = require('path');

const serverErrorTxt = "There has been a server error. Please reload the page and try again!";


const pool = new Pool({
    connectionString: "postgres://postgres:1234567@localhost:5432/minesweeper"
    //connectionString: "postgres://postgres:postgres@localhost:5432/miner"
});

const teamplayField             = {width: 40, height: 20, num: 160};
const singlePlayerSmallField    = {width: 8, height: 8, num: 10};
const singlePlayerMediumField   = {width: 16, height: 16, num: 40};
const singlePlayerLargeField    = {width: 30, height: 16, num: 99};

multiplayer.run(io, pool, teamplayField);

const sha512 = function(password){
    let salt = crypto.randomBytes(16)
            .toString('hex') 
            .slice(0, 32);

    var hash = crypto.createHmac('sha512', salt);
    hash.update(password);
    var value = hash.digest('hex');
    return {
        salt:salt,
        passwordHash:value
    };
};

const verify = function(password, salt, fh) {
    var hash = crypto.createHmac('sha512', salt);
    hash.update(password);
    var value = hash.digest('hex');

    if (value === fh) return true;
    return false;
};

function findUserByField(field, value) {

    let token = "" + (Math.random()*100000000 ^ 0);

    if (!field || !value) {
        myEmitter.emit(`found${token}`, {error: true, text: "wrong function call"});
        return;
    }

    let validfield = ["username", "email", "access_token", "name"].some(fieldname => {
        if (field === fieldname) return true;
        return false;
    });

    if (!validfield) {
        myEmitter.emit(`found${token}`, {error: true, text: "wrong function call"});
        return;
    }

    let query = `SELECT * FROM users WHERE ${field} = '${value}';`;

    pool.connect((err, client, release) => {
        if (err) {
            myEmitter.emit(`found${token}`, {error: true, text: "wrong function call", stack: err.stack})
            console.error('Error acquiring client', err.stack);
            return;
        }
        client.query(query, (err, result) => {

            release();

            if (err) {
	            console.log(err);
                myEmitter.emit(`found${token}`, {error: true});
            } else {
                myEmitter.emit(`found${token}`, result.rows);
	    }
        })
    })

    return token;
};

app.use(cookieParser());

app.use(express.static(__dirname + '/public'));

app.use('/timesync', timesyncServer.requestHandler);

app.set("view engine", "ejs");

app.use(bodyParser.json());

app.use(require('serve-favicon')(path.join(__dirname, 'public', 'images', 'favicon.ico')));

app.use(function(req, res, next) { 
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.use((req, res, next)=>{
    if (req.cookies.access_token) {

        let token = findUserByField("access_token", escape(req.cookies.access_token));

        //TODO: why dont i just call next once at the end? gotta test
        myEmitter.once(`found${token}`, result=>{

            if (result.error) {
                next();
                return res.status(500).send("Error occured while checking accesstoken");
            }
            if (result.length) {
                req.userInfo = {
                    isLoggedIn: true,
                    username: result[0].username,
                    name: result[0].name,
                    rank: result[0].rank,
                    avatar: result[0].avatar || "/images/profile-pic-placeholder.png" 
                }
            } else {
                deleteCookies(res, ["access_token"]);
            }
            next();
        });
    } else if (req.cookies.guest_token) {
        req.userInfo = {
            isGuest: true,
            username: `Guest${req.cookies.guest_token.substr(-8, 8)}`,
            name: null,
            rank: 0,
            avatar: "/images/profile-pic-placeholder.png"
        }
        next();
    } else {
        next();
    }
});

function deleteCookies(res, cookieNames) {
    cookieNames.forEach(cookie => {
        res.cookie(cookie, "null", {
            maxAge: 1
        })
    });
}

app.get("/", (req, res)=>{
    if (req.userInfo && (req.userInfo.isLoggedIn || req.userInfo.isGuest)) {

        res.render("tables", {
            isLoggedIn: req.userInfo.isLoggedIn,
            isGuest: req.userInfo.isGuest,
            username: req.userInfo.username,
            name: req.userInfo.name,
            rank: req.userInfo.rank,
            avatar: req.userInfo.avatar || "/images/profile-pic-placeholder.png",
            privateGame: false,
            gameId: null
        });

    } else {
        res.render("index", {game: {
            singlePlayer: true,
            width: 10,
            height: 10,
            num: 15
            },
            isLoggedIn: false,
            isGuest: false,
            forceToLogIn: false
        });
    }
});

app.get("/champions-table", (req, res) => {
    res.render("champions-table", {isLoggedIn: req.userInfo && req.userInfo.isLoggedIn, 
                                    isGuest: req.userInfo && req.userInfo.isGuest});
})

app.get("/rules", (req, res) => {
    res.render("rules", {isLoggedIn: req.userInfo && req.userInfo.isLoggedIn,
                        isGuest: req.userInfo && req.userInfo.isGuest});
})

app.get("/records/:table", (req, res) => {
    pool.connect((err, client, release) => {

        let query;
        let page = req.query.page;

        if (req.query.param) {
            query = `SELECT * FROM ${escape(req.params.table)} WHERE gametype = '${escape(req.query.param)}' ORDER BY timems ASC ;`;
        } else {
            query = `SELECT * FROM ${escape(req.params.table)} ORDER BY ${req.params.table == "users" ? "rank DESC" : "timems ASC"}`;
        }

        if (err) {
            console.log(err)
            return res.status(500).send(serverErrorTxt);
        }
        client.query(query, (err, result) => {

            release();

            if (err) {
                console.log(err)
                return res.status(500).send(serverErrorTxt);
            }

            let bestResult = null;

            if (req.query.getMyBest && req.userInfo && req.userInfo.isLoggedIn) {
                for (var i = 0; i < result.rows.length; i++) {
                    if (req.params.table == "users") {

                        if (result.rows[i].username == req.userInfo.username) {
                            bestResult = i < 20 ? i : result.rows[i];
                            break;
                        }

                    } else if (req.params.table == "recordstwoplayers") {
                        if (result.rows[i].player1username == req.userInfo.username || result.rows[i].player2username == req.userInfo.username) {
                            bestResult = i < 20 ? i : result.rows[i];
                            break;
                        }

                    } else if (req.params.table == "recordssingleplayer") {

                        if (result.rows[i].playerusername == req.userInfo.username) {
                            bestResult = i < 20 ? i : result.rows[i];
                            break;
                        }

                    }
                }

                if (bestResult && typeof bestResult === "object") {
                    bestResult.num = i;
                }
            }


            res.send(JSON.stringify({
                records:    result.rows.slice((page - 1) * 20, page * 20),
                page:       page,
                pagesTotal: Math.ceil(result.rows.length / 10),
                bestResult
            }));

        })
    })
    
})

app.get("/tablesInfo", (req, res) => {

    if (!req.userInfo) return res.sendStatus(403);

    let tables = multiplayer.getTablesForUser(req.userInfo.username);
    let page = +req.query.page;

    while (Math.ceil(tables.length / 10) < page) page--;

    res.send(JSON.stringify({
        tables: tables.slice((page - 1) * 10, page * 10).map(item=>{
            return {
                finishTime: item.finishTime,
                gameId: item.gameId,
                isGameOn: item.isGameOn,
                player1: item.player1,
                player2: item.player2,
                startTime: item.startTime,
                tableNum: item.tableNum
            };
        }),
        page:       page,
        username:   req.userInfo.username,
        pagesTotal: Math.ceil(tables.length / 10)
    }));

})

app.post("/check", (req, res) => {
    
    let token = findUserByField(escape(req.body.field), escape(req.body.value));
    
    myEmitter.once(`found${token}`, result=>{
        if (result.error) {
    	    res.status(500).send(serverErrorTxt);
        } else {
            res.send(JSON.stringify(result))
	    }
    });

});

app.post("/reg", (req, res) => {

    let promise = new Promise((resolve, reject)=>{

        let query = `SELECT username FROM users WHERE username = '${escape(req.body.username)}'
                                                   OR email = '${escape(req.body.email)}';`;

        pool.connect((err, client, release) => {
            if (err) {
                reject();
            }
            client.query(query, (err, result) => {

                release()

                if (err) {
                    reject();
                }
                resolve(result);
            })
        })
    });
    promise
    .then(result => {
        if (result.rows.length) {
            if (result.rows[0].username === req.body.username) res.status(444).send("Username already in use!"); 
            else res.status(466).send("Email already in use!");
            return;
        }
        pool.connect((err, client, done) => {

            const shouldAbort = (err, res) => {
              if (err) {
                console.error('Error in transaction', err.stack)
                client.query('ROLLBACK', (err) => {
                  if (err) {
                    console.error('Error rolling back client', err.stack)
                  }

                  res.status(500).send(serverErrorTxt)
                  done();
                })
              }

              return !!err
            }
          
            client.query('BEGIN', (err) => {
                if (shouldAbort(err, res)) return;
                
                let query = `INSERT INTO users (username, email) VALUES ('${escape(req.body.username)}', '${escape(req.body.email)}') RETURNING id;`;
        
                client.query(query, (err, result) => {
                    if (shouldAbort(err, res)) return;
                    let pw = sha512(req.body.password);

                    client.query(`INSERT INTO passwords (id, st, fh) VALUES (${result.rows[0].id}, '${pw.salt}', '${pw.passwordHash}')`, (err, result) => {
                        if (shouldAbort(err, res)) return;
          
                        client.query('COMMIT', (err) => {
                            if (shouldAbort(err, res)) return;
                            res.sendStatus(200);
                            done();
                        })
                    })
                })
            })
        })
    })
    .catch(()=>{
        res.status(500).send(serverErrorTxt);
    })
});

app.post("/login", (req, res) => {
    let promise = new Promise((resolve, reject)=>{

        let query = `SELECT DISTINCT id FROM users WHERE username = '${escape(req.body.username)}'
                                                   OR email = '${escape(req.body.username)}';`;

        pool.connect((err, client, release) => {
            if (err) {
                reject();
            }
            client.query(query, (err, result) => {

                release()

                if (err) {
                    reject();
                }
                resolve(result);
            })
        })
    });
    promise
    .then(result => {
        if (!result.rows.length) return res.sendStatus(401);

        let query = `SELECT DISTINCT * FROM passwords WHERE id = '${result.rows[0].id}'`;

        pool.connect((err, client, done) => {

            if (err) {
                return console.error('Error acquiring client', err.stack)
            }

            client.query(query, (err, result) => {

                done();

                if (err) {
                    reject();
                }

                if (!verify(req.body.password, result.rows[0].st, result.rows[0].fh)) return res.sendStatus(401);
                
                let access_token = crypto.randomBytes(16)
                .toString('hex') 
                .slice(0, 32);
                
                let query = `UPDATE users SET access_token = '${access_token}' WHERE id = '${result.rows[0].id}'`;
                pool.connect((err, client, done) => {
                    
                    if (err) {
                        return console.error('Error acquiring client', err.stack)
                    }
                    
                    client.query(query, (err, result) => {
                        
                        done()
                        
                        if (err) {
                            throw Error(500);
                        }

                        res.cookie("access_token", access_token, {
                            //domain,
                            maxAge: 1000 * 60 * 60 * 24 * 30
                        });
                        
                        res.sendStatus(200);        
                    })
              
                })
                
            })
            
        })
    })
    .catch(()=>{
        res.sendStatus(500);
    })
})

app.get("/GuestRequest", (req, res) => {
    if (req.userInfo && req.userInfo.isLoggedIn) 
        return res.status(200).send("You are already logged in!");

    let guest_token = crypto.randomBytes(16)
    .toString('hex') 
    .slice(0, 32);

    res.cookie("guest_token", guest_token, {
        //domain,
        maxAge: 1000 * 60 * 60 * 24
    });

    res.send();
})

app.post("/join", (req, res) => {
    var table = multiplayer.joinGame(req.userInfo, req.body.gameId);

    if (typeof table === "string") {
        res.status(404).send(table)
        return;
    }

    var game = {
        singlePlayer: false,
        width: teamplayField.width,
        height: teamplayField.height,
        num: teamplayField.num,
        gameId: table.gameId
    };

    game.fieldSize = "multiplayer_large";

    res.render(path.join("partitials","gameField"), {
        game: game,
        player1: table.player1,
        player2: req.userInfo,
        isLoggedIn: req.userInfo.isLoggedIn
    });
})

app.post("/newgame", (req, res) => {
    var game = {
        singlePlayer: req.body.singlePlayer
    };

    let fieldSizes;

    if (game.singlePlayer) {
        switch (req.body.fieldSize) {
            case "Easy" :
                fieldSizes = singlePlayerSmallField;
                break;

            case "Medium" :
                fieldSizes = singlePlayerMediumField;
                break;

            case "Hard" :
                fieldSizes = singlePlayerLargeField;
                break;
        }
    } else {
        fieldSizes = teamplayField;
    }

    game.width = fieldSizes.width;
    game.height = fieldSizes.height;
    game.num = fieldSizes.num;

    game.gameId = game.singlePlayer ? undefined : multiplayer.createNewTable(req.userInfo, req.body.private).gameId;

    game.fieldSize = req.body.fieldSize;
console.log("render shit")
    res.render(path.join("partitials", "gameField"), {
        game: game,
        player1: req.userInfo,
        player2: {},
        isLoggedIn: req.userInfo.isLoggedIn
    });

});

app.get("/private/:gameid", (req, res) => {
    if (!req.userInfo) {
        res.render("index", {game: {
            singlePlayer: true,
            width: 10,
            height: 10,
            num: 15
            },
            isLoggedIn: false,
            isGuest: false,
            forceToLogIn: true
        });

    return;    
    }

    res.render("tables", {
        isLoggedIn: req.userInfo.isLoggedIn,
        isGuest: req.userInfo.isGuest,
        username: req.userInfo.username,
        name: req.userInfo.name,
        rank: req.userInfo.rank,
        avatar: req.userInfo.avatar || "/images/profile-pic-placeholder.png",
        privateGame: true,
        gameId: Buffer.from(req.params.gameid, 'base64').toString()
    });

})
app.post("/new-singleplayer-record", (req, res) => { 
    if (req.userInfo.isGuest) req.userInfo.username = "Guest";
    pool.connect((err, client, release) => {

        if (req.body.timems % 1 !== 0 || !(~["easy", "medium", "hard"].indexOf(req.body.gameType))) {
            console.log("/new-singleplayer-record: bad parameters");
            res.status(400).send("Bad parameters");
            return;
        }

        let query = `INSERT INTO recordssingleplayer (playerusername, timems, gametype) 
                                            values ('${req.userInfo.username}', '${req.body.timems}', '${req.body.gameType}') returning gameId`;
        if (err) {
            console.log("Error occured while connecting to pool:", err);
            res.status(500).send("Error occured while connecting to pool.");
            return;
        }

        client.query(query, (err, result) => {

            if (err) {
                console.log("Error while inserting single player records.", err);
                res.status(500).send("Error while inserting single player records");
                return;
            }

            let dbGameId = result.rows[0].gameid;

            release();

            pool.connect((err, client, release) => {
                let query = `SELECT * FROM recordssingleplayer WHERE gametype = '${escape(req.body.gameType)}' ORDER BY timems ASC`;
                if (err) {
                    console.log("Error occured while connecting to pool:", err);
                    res.status(500).send("Error occured while connecting to pool.");
                    return;
                }
                client.query(query, (err, result) => {

                    release();

                    if (err) {
                        console.log("selecting top records from singleplayer: ", err);
                        res.status(500).send(serverErrorTxt);
                        return;
                    }

                    let currentGame, k = -1;
                    result.rows.forEach((item, i) => {
                        if (item.gameid == dbGameId) k = i;
                    })

                    currentGame = result.rows[k];
                    currentGame.num = k;
                    currentGame.isCurrentGame = true;

                    result.rows.splice(10);
                    if (k >= 10) result.rows.push(currentGame);

                    res.send(JSON.stringify(result.rows));
                })
            })

        })
    })

})
