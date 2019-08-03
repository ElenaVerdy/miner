const domain = "192.168.1.64";
const express = require("express");
const cookieParser = require('cookie-parser');
const app = express();
const bodyParser = require('body-parser');
const port = process.env.PORT || 3000;
const server = app.listen(port, ()=>{console.log(`server started on port ${port}`)});
const io = require("socket.io")(server);
const EventEmitter = require('events');
class MyEmitter extends EventEmitter {}
const myEmitter = new MyEmitter();
const crypto = require("crypto");
const multiplayer = require("playingInit.js");
const { Pool } = require('pg');
const pool = new Pool({
    connectionString: "postgres://postgres:1234567@localhost:5432/minesweeper"
});

multiplayer.run(io, pool);

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
    
    if (!(field && value && token)) {
        myEmitter.emit(`found${token}`, {error: true});
        return;
    }
    
    let validfield = ["username", "email", "access_token", "name"].some(fieldname => {
        if (field === fieldname) return true;
        return false;
    });
    
    if (!validfield) {
        myEmitter.emit(`found${token}`, {error: true});
        return;
    }
    
    let query = `SELECT * FROM users WHERE ${field} = '${value}';`;

    pool.connect((err, client, release) => {
        if (err) {
            return console.error('Error acquiring client', err.stack)
        }
        client.query(query, (err, result) => {

            release();

            if (err) {
                myEmitter.emit(`found${token}`, {error: true});
            }

            myEmitter.emit(`found${token}`, result.rows);
        })
    })

    return token;
};

app.use(cookieParser());

app.use(express.static(__dirname + '/public'));
app.set("view engine", "ejs");

app.use(bodyParser.json());

app.use((req, res, next)=>{

    if (req.cookies.access_token) {

        let token = findUserByField("access_token", escape(req.cookies.access_token));

        myEmitter.once(`found${token}`, result=>{

            if (result.error) return res.sendStatus(500);
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
            domain: domain,
            maxAge: 1,
            path: "/"
        })
    });
}

app.get("/", (req, res)=>{
    if (req.userInfo && (req.userInfo.isLoggedIn || req.userInfo.isGuest)) {

        res.render("tables", {
            isLoggedIn: req.userInfo.isLoggedIn,
            isVuest: req.userInfo.isGuest,
            username: req.userInfo.username,
            name: req.userInfo.name,
            rank: req.userInfo.rank,
            avatar: req.userInfo.avatar || "/images/profile-pic-placeholder.png",
            tables: multiplayer.getTables()
        });
    
    } else {
        res.render("index", {game: {
            singlePlayer: true,
            width: 10,
            height: 10,
            num: 15
            },
            isLoggedIn: false
        });
    }
});

app.post("/check", (req, res) => {
    
    let token = findUserByField(escape(req.body.field), escape(req.body.value));
    
    myEmitter.once(`found${token}`, result=>{
        if (result.error) res.sendStatus(500);
        res.send(JSON.stringify(result))
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
            if (result.rows[0].username === req.body.username) res.sendStatus(444);
            else res.sendStatus(466);
            return;
        }
        pool.connect((err, client, done) => {

            const shouldAbort = (err) => {
              if (err) {
                console.error('Error in transaction', err.stack)
                client.query('ROLLBACK', (err) => {
                  if (err) {
                    console.error('Error rolling back client', err.stack)
                  }
                  done()
                })
              }

              return !!err
            }
          
            client.query('BEGIN', (err) => {
                if (shouldAbort(err)) throw new Error();
                
                let query = `INSERT INTO users (username, email) VALUES ('${escape(req.body.username)}', '${escape(req.body.email)}') RETURNING id;`;
        
                client.query(query, (err, result) => {
                    if (shouldAbort(err)) throw new Error();
                    let pw = sha512(req.body.password);

                    client.query(`INSERT INTO passwords (id, st, fh) VALUES (${result.rows[0].id}, '${pw.salt}', '${pw.passwordHash}')`, (err, result) => {
                        if (shouldAbort(err)) throw new Error();
          
                        client.query('COMMIT', (err) => {
                            if (err) {
                            console.error('Error committing transaction', err.stack)
                            throw new Error();
                            }
                            res.sendStatus(200);
                            done();
                        })
                    })
                })
            })
        })
    })
    .catch(()=>{
        res.sendStatus(500);
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

                done()

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
                            domain: domain,
                            maxAge: 1000 * 60 * 60 * 24 * 30,
                            path: "/"
                        })
                
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

app.post("/join", (req, res) => {

    var table = multiplayer.joinGame(req.userInfo, req.body.gameId);
    
    if (!table) res.status(404).send("The game wasn't found. It probably ended, please refresh the page.")
    
    var game = {
        singlePlayer: false,
        width: 50,
        height: 16,
        num: 180,
        gameId: table.gameId
    };

    res.render("partitials/gameField", {
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

    if (game.singlePlayer) {
        switch (req.body.fieldSize) {
            case "easy" :
                game.width = game.height = 8;
                game.num = 10;
                break;
            
            case "medium" :
                game.width = game.height = 16;
                game.num = 40;                
                break;
            
            case "hard" :
                game.width = 30;
                game.height = 16;
                game.num = 99;                                
                break;
        }
    } else {
        game.width = 50;
        game.height = 18;
        game.num = 180;                
    }
    
    game.gameId = game.singlePlayer ? undefined : multiplayer.createNewTable(req.userInfo).gameId;

    res.render("partitials/gameField", {
        game: game,
        player1: req.userInfo,
        player2: {},
        isLoggedIn: req.userInfo.isLoggedIn
    });

});