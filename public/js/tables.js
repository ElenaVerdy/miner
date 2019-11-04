let address = "http://192.168.1.123:3000";
let socket = io.connect(address);
let multiplayer;
const timeToAcceptSuggestion = 5000;

//Only need this for the game start and replay suggestions. Recalc every two minutes. Mb reduce it further  
var ts = timesync.create({
    server: '/timesync',
    interval: 1000 * 60 * 2
});


window.onload = ()=>{
    let tables = document.getElementsByClassName("game-table");
    if (tables.length == 10 ) return;
    for (let i = 0; i < 10 - tables.length; i++) {
        let newNode = tables[0].cloneNode(true);
        tables[0].parentElement.appendChild(newNode);
    }
}

Date.prototype.toStringLoc = function(){
    let ISO = this.toISOString();
    return ISO.slice(8, 10) + "." + ISO.slice(5,7) + "." + ISO.slice(0,4) + " " + ISO.slice(11,13) + ":" + ISO.slice(14,16);
}

const error = (status) => {
    let errorMsg = document.getElementById("serverError");
    
    switch (status) {
        
        case 404: 
            errorMsg.getElementsByClassName("error-text")[0].innerHTML = "We couldn't find the page your are looking for. Doublecheck the link and try again."
            break;
        
        default:
            errorMsg.getElementsByClassName("error-text")[0].innerHTML = "Unfortunately, there has been a mistake something went wrong. We're sorry."
            break;
    }

    errorMsg.style.display = "block";
    errorMsg.onclick = () => {
        errorMsg.style.display = "none";
    }
}

const WaitingModal = function (){
    let modalBody = document.getElementsByClassName("waitingForOtherPlayer")[0];
    let modalBlock = document.getElementById("waitingForOtherPlayer");
    let timer = null;
    let outerTimer = null;

    function ready(startTime) {
        let msLeft = startTime - ts.now();
        modalBlock.style.display = "block";
        clearInterval(timer);
        clearTimeout(outerTimer);
        
        modalBody.innerHTML = `
        <h1 class="modal-body_header">Your game is going to start in <span class="start-countdown">
                ${(msLeft / 1000) ^ 0}</span> seconds.</h1><h4 class="gl-hf">Good Luck! Have Fun!<h4>
        `;   
        
        let startCountdown = document.getElementsByClassName("start-countdown")[0];
        outerTimer = setTimeout(()=>{
            timer = setInterval(()=>{
    
                if (!document.getElementsByClassName("start-countdown")[0]) {
                    clearInterval(timer);
                    clearTimeout(outerTimer);
                    return;                   
                }
                if (startCountdown.innerHTML == 1) {
                    hide();    
                }
                startCountdown.innerHTML = startCountdown.innerHTML - 1;
            }, 1000)
        }, msLeft % 1000)
    };

    
    function lookingForOtherPlayer() {
        modalBlock.style.display = "block";
        clearInterval(timer);
        clearTimeout(outerTimer)
        modalBody.innerHTML = `
        <h1 class="looking-for-other-player_header">Waiting for your teammate</h1>
        <div class="lds-grid"><div></div><div></div><div></div></div>
        <div class="url-wrapper" hidden>
            <input type="text" class="url-text">
            <button class="copy-btn">Click to copy</button>
        </div>
        <div>To go back to tables click <a href="/">here</a></div>`;
    };
        
    function hide() {
        modalBlock.style.display = "none";
        clearInterval(timer);
        clearTimeout(outerTimer);
    }
    
    this.ready = ready;
    this.lookingForOtherPlayer = lookingForOtherPlayer;
    this.hide = hide;
};

let waitingModal = new WaitingModal();

//singleplayer
document.getElementsByClassName("singleplayer-dropdown-menu")[0].onclick = event => {
    if (!event.target.classList.contains("singleplayer-menu-item")) return;

    let http = new XMLHttpRequest();

    http.open("POST", `${address}/newgame`);
    http.setRequestHeader('Content-Type', 'application/json; charset=UTF-8')
    http.onreadystatechange = function() {
        
        if (this.status === 500) return error(500);

        if (this.readyState !== 4 || this.status !== 200) return;

        document.getElementsByClassName("content-page")[0].innerHTML = this.response;

        document.getElementsByClassName("content-page")[0].classList.add("content-page-ingame");

        s = document.createElement("script");       
        s.setAttribute("src", "/js/clientSinglePlayer.js");        
        document.body.appendChild(s);
        clearInterval(fieldUpdateTimer);

    };

    http.send(JSON.stringify({
        singlePlayer: true,
        fieldSize: event.target.innerHTML
    }));
   
}

//multiplayer new game
document.body.addEventListener("click", event => {
    if (!event.target.classList.contains("delegation_start-game")) return;

    if (event.target.classList.contains("delegation_start-game_singleplayer")) {
        document.getElementById("gameResults").style.display = "none";
        document.getElementsByClassName("restart")[0].click();

        return;
    }

    const isPrivate = event.target.classList.contains("private-game");

    let http = new XMLHttpRequest();

    http.open("POST", `${address}/newgame`);
    http.setRequestHeader('Content-Type', 'application/json; charset=UTF-8')
    http.onreadystatechange = function() {
        
        if (this.status === 500) return error(500);

        if (this.readyState !== 4 || this.status !== 200) return;

        let gameId_old = event.target.classList.contains("play-again") ? document.getElementById("table").getAttribute("gameid") : null;

        document.getElementsByClassName("content-page")[0].innerHTML = this.response;

        document.getElementsByClassName("content-page")[0].classList.add("content-page-ingame");

        let gameId = document.getElementById("table").getAttribute("gameId");
        
        if (!gameId_old) {
            
            waitingModal.lookingForOtherPlayer();

            s = document.createElement("script");       
            s.setAttribute("src", "/js/clientMultiPlayer.js");

            document.body.appendChild(s);
            s.onload = () => {
        
                clearInterval(fieldUpdateTimer);
                multiplayer = new Multiplayer(socket, "player1");
                socket.emit("join", { gameId, username: document.querySelector(".player1info .username").innerHTML });

            }

            if (!isPrivate) return;

            document.getElementsByClassName("url-wrapper")[0].removeAttribute("hidden");
            document.getElementsByClassName("url-text")[0].value = `${address}/private/${btoa(gameId)}`

            document.getElementsByClassName("copy-btn")[0].onclick = () => {
            
                let copyText = document.getElementsByClassName("url-text")[0];
                copyText.select();
                document.execCommand("copy");
            
            }
                
        } else {

            multiplayer.startOver();
            if (isPrivate) {
                socket.emit("playAgain", {gameId, gameId_old});
            } else {
                waitingModal.lookingForOtherPlayer();
                document.getElementById("play-again-suggestion").style.display = "none";
            }

            socket.emit("join", { gameId, username: document.querySelector(".player1info .username").innerHTML });
        
        }
                      
    };

    http.send(JSON.stringify({
        singlePlayer: false,
        private: isPrivate,
        playAgain: event.target.classList.contains("play-again")
    }));
   
})

//multiplayer join game
document.body.addEventListener("click", event => {
    if (!event.target.classList.contains("delegation_join-button")) return;
    
    let http = new XMLHttpRequest();

    http.open("POST", `${address}/join`);
    http.setRequestHeader('Content-Type', 'application/json; charset=UTF-8')
    http.onreadystatechange = function() {
        
        if (this.status === 500) return error(500);
        
        if (this.readyState === 3 && this.status === 404) {
            return error(404);
        }
        if (this.readyState !== 4 || this.status !== 200) return;

        document.getElementsByClassName("content-page")[0].innerHTML = this.response;

        document.getElementsByClassName("content-page")[0].classList.add("content-page-ingame");
        
        if (!event.target.classList.contains("play-again")) {

            s = document.createElement("script");       
            s.setAttribute("src", "/js/clientMultiPlayer.js");
    
            document.body.appendChild(s);
            s.onload = () => {
                multiplayer = new Multiplayer(socket);
                clearInterval(fieldUpdateTimer);
    
                socket.emit("join", {gameId: event.target.getAttribute("gameId"),
                                     username: document.querySelector(".player2info .username").innerHTML});
            
                if (event.target.classList.contains("continue")) {
                    socket.emit("getFieldInfo", {gameId: event.target.getAttribute("gameId")})   
                }
            }
    
        } else {            
            multiplayer.startOver();
            socket.emit("join", {gameId: event.target.getAttribute("gameId"),
                                        username: document.querySelector(".player2info .username").innerHTML});                
        
        }
        if (!event.target.classList.contains("continue")) {
            waitingModal.lookingForOtherPlayer();
        }
        
    };

    http.send(JSON.stringify({
        gameId: event.target.getAttribute("gameId")
    }));
})

function updatePlayersInfo(playersInfo) {

    if (playersInfo.player1) { 
        document.querySelector(".player1info .avatar").setAttribute("src", playersInfo.player1.avatar);
        document.querySelector(".player1info .rank").innerHTML = playersInfo.player1.rank;
        document.querySelector(".player1info .username").innerHTML = playersInfo.player1.name || playersInfo.player1.username;
        
        playersInfo.player1.isInGame ? document.querySelector(".player1info").classList.remove("player-info_disconnected") :
                                       document.querySelector(".player1info").classList.add("player-info_disconnected");
    }
    if (playersInfo.player2) { 
        document.querySelector(".player2info .avatar").setAttribute("src", playersInfo.player2.avatar);
        document.querySelector(".player2info .rank").innerHTML = playersInfo.player2.rank;
        document.querySelector(".player2info .username").innerHTML = playersInfo.player2.name || playersInfo.player2.username;

        playersInfo.player2.isInGame ? document.querySelector(".player2info").classList.remove("player-info_disconnected") :
                                       document.querySelector(".player2info").classList.add("player-info_disconnected");   

    } else {
        document.querySelector(".player2info .avatar").setAttribute("src", "/images/waiting.png");
        document.querySelector(".player2info .rank").innerHTML = 9999;
        document.querySelector(".player2info .username").innerHTML = "Player 2";
        document.querySelector(".player2info").classList.add("player-info_disconnected");   
        
    } 
}

socket.on("playersInfoUpdated", data=>{updatePlayersInfo(data)});

socket.on("ready", data => {
    updatePlayersInfo(data);

    document.getElementById("play-again-suggestion").style.display = "none";
    
    waitingModal.ready(data.startTime);
});
(function(){
    let playAgainSuggestionText;

    socket.on("replayDeclined", data => {

        if (playAgainSuggestionText){

            timerHTML = playAgainSuggestionText.getElementsByClassName("redirection-countdown")[0];
            if (timerHTML) {
                timerHTML.innerHTML = 1;
            }
            playAgainSuggestionText = null;
        } else {
            error(500);
        }
    });

    socket.on("playAgainSuggestion", data => {

        let isInitiator = data.initiator === socket.id;
        let username, timerHTML, timer, outerTimer;
        let msLeft = data.sendTime + timeToAcceptSuggestion - ts.now(); 

        let playAgainBtn = document.getElementsByClassName("game-result-btn_play-again")[0];

        document.getElementById("gameResults").style.display = "none";
        document.getElementById("play-again-suggestion").style.display = "block";
        document.getElementsByClassName("play-again-suggestion_waiting")[0].classList.add("collapse");
        document.getElementsByClassName("play-again-suggestion_answer")[0].classList.add("collapse");


        playAgainSuggestionText = isInitiator ? document.getElementsByClassName("play-again-suggestion_waiting")[0]
                                              : document.getElementsByClassName("play-again-suggestion_answer")[0];


        if (isInitiator) {
            playAgainBtn.setAttribute("disabled", "disabled");
            playAgainBtn.innerHTML = "Play again";
        } else {
            playAgainBtn.removeAttribute("disabled");
            playAgainBtn.innerHTML = "join";
            playAgainBtn.setAttribute("gameId", data.gameId);
            playAgainBtn.classList.add("delegation_join-button");
        }

        playAgainSuggestionText.classList.remove("collapse");
        username = playAgainSuggestionText.getElementsByClassName("username")[0];
        username.innerHTML = data.initiatorUsername;
        
        timerHTML = playAgainSuggestionText.getElementsByClassName("redirection-countdown")[0];

        timerHTML.innerHTML = (msLeft / 1000) ^ 0;

        outerTimer = setTimeout(function(){

            timer = setInterval(()=>{
                if (!timerHTML.offsetParent) {
                    clearInterval(timer);
                    clearTimeout(outerTimer);
                    return;                   
                }
                if (timerHTML.innerHTML == 1) {
                    clearInterval(timer);
                    clearTimeout(outerTimer);

                    if (isInitiator) {
                        
                        let newGameBtn = document.createElement("button");
                        newGameBtn.classList.add("delegation_start-game", "public-game", "play-again");
                        newGameBtn.style.display = "none";
                        document.body.appendChild(newGameBtn);

                        newGameBtn.dispatchEvent(new Event("click", {bubbles: true}));
                        
                        document.getElementById("play-again-suggestion").style.display = "none";
                    } else {
                        window.location.href = `${address}`;
                    }
                }
                timerHTML.innerHTML = timerHTML.innerHTML - 1;
            }, 1000)
        }, msLeft % 1000);
    });
})()
socket.on("playerLeftBeforeTheGameStarted", data => {
    updatePlayersInfo(data);
    waitingModal.lookingForOtherPlayer();
});

if (document.getElementsByClassName("private-game-by-id").length) {
    document.getElementsByClassName("private-game-by-id")[0].dispatchEvent(new Event("click", {bubbles: true}));

    if (document.getElementsByClassName("private-game-by-id").length) {
        document.getElementsByClassName("private-game-by-id")[0].parentElement.parentElement
                .removeChild(document.getElementsByClassName("private-game-by-id")[0].parentElement);
    }

    history.pushState(null, "minesweeper", "/")
}
const tables = {
    tables: Array.from(document.querySelectorAll(".game-table")),
    nums: Array.from(document.querySelectorAll(".num .float_right")),
    joinBtn: Array.from(document.querySelectorAll(".join-button-wrapper")),
    
    player1: {
        continuebtn: Array.from(document.querySelectorAll(".player1wrapper .continue")),
        name: Array.from(document.querySelectorAll(".player1name")),
        rank: Array.from(document.querySelectorAll(".player1wrapper .rank")),
        rankWrapper: Array.from(document.querySelectorAll(".player1wrapper .rank-wrapper"))
    },
    player2: {
        wrapper: Array.from(document.querySelectorAll(".player2wrapper")),
        continuebtn: Array.from(document.querySelectorAll(".player2wrapper .continue")),
        name: Array.from(document.querySelectorAll(".player2name")),
        rank: Array.from(document.querySelectorAll(".player2wrapper .rank")),
        rankWrapper: Array.from(document.querySelectorAll(".player2wrapper .rank-wrapper"))
    }
}

function updateTables(tablesInfo, page, username, pagesTotal){
    if (!document.getElementsByClassName("tables").length) return;

    tablesInfo.forEach((table, i)=>{
        tables.tables[i].removeAttribute("hidden");

        tables.nums[i].innerHTML = table.tableNum;

        if (table.isGameOn && !table.player1.isInGame && table.player1.username === username) {
            tables.player1.rankWrapper[i].setAttribute("hidden", "hidden");
            tables.player1.name[i].setAttribute("hidden", "hidden");            
            tables.player1.continuebtn[i].removeAttribute("hidden");
            tables.player1.continuebtn[i].setAttribute("gameId", table.gameId);
        } else {
            tables.player1.continuebtn[i].setAttribute("hidden", "hidden");
            tables.player1.rankWrapper[i].removeAttribute("hidden");
            tables.player1.name[i].removeAttribute("hidden");
            tables.player1.name[i].innerHTML = table.player1.name || table.player1.username;
            tables.player1.rank[i].innerHTML = table.player1.rank;
        }
        
        
        if (table.player2) {
            tables.player2.wrapper[i].removeAttribute("hidden");

            if (table.isGameOn && !table.player2.isInGame && table.player2.username === username) {
                tables.player2.rankWrapper[i].setAttribute("hidden", "hidden");
                tables.player2.name[i].setAttribute("hidden", "hidden");            
                tables.player2.continuebtn[i].removeAttribute("hidden");
                tables.player2.continuebtn[i].setAttribute("gameId", table.gameId);
            } else {
                tables.player2.continuebtn[i].setAttribute("hidden", "hidden");
                tables.player2.rankWrapper[i].removeAttribute("hidden");
                tables.player2.name[i].removeAttribute("hidden");
                tables.player2.name[i].innerHTML = table.player2.name || table.player2.username;
                tables.player2.rank[i].innerHTML = table.player2.rank;
            }
        } else {
            tables.player2.wrapper[i].setAttribute("hidden", "hidden");
            tables.joinBtn[i].removeAttribute("hidden");
            tables.joinBtn[i].children[0].setAttribute("gameId", table.gameId)
        }
    });

    if (tablesInfo.length < 10) {
        for (let i = 0; i < 10 - tablesInfo.length; i++ ) {
            tables.tables[9 - i].setAttribute("hidden", "hidden");
        }
    }
    paginationCurrent.innerHTML = page || 1;
    page === 0 || page === 1 ? document.getElementsByClassName("pagination_prev")[0].parentElement.classList.add("disabled")
               : document.getElementsByClassName("pagination_prev")[0].parentElement.classList.remove("disabled");

    page === pagesTotal ? document.getElementsByClassName("pagination_next")[0].parentElement.classList.add("disabled")
                        : document.getElementsByClassName("pagination_next")[0].parentElement.classList.remove("disabled");
           
}

const paginationCurrent = document.getElementsByClassName("pagination_active")[0];
document.getElementsByClassName("pagination_prev")[0].onclick = event => {
    if (event.target.classList.contains("disabled")) return; 

    paginationCurrent.innerHTML = +paginationCurrent.innerHTML - 1;
    getTablesByPage(+paginationCurrent.innerHTML);
}

document.getElementsByClassName("pagination_next")[0].onclick = event => {
    if (event.target.classList.contains("disabled")) return; 

    paginationCurrent.innerHTML = +paginationCurrent.innerHTML + 1;
    getTablesByPage(+paginationCurrent.innerHTML);
}

function getTablesByPage(page) {
    let http = new XMLHttpRequest();

    http.open("GET", `${address}/tablesInfo?page=${page}`);
    http.setRequestHeader('Content-Type', 'application/json; charset=UTF-8')
    http.onreadystatechange = function() {
        
        if (this.status === 500) return error(500);
        
        if (this.readyState !== 4 || this.status !== 200) return;

        let response = JSON.parse(this.response); 
        updateTables(response.tables, response.page, response.username, response.pagesTotal)
    }
    http.send();

}

getTablesByPage(1);

let fieldUpdateTimer = setInterval(()=>{
    getTablesByPage(+paginationCurrent.innerHTML);
}, 1000);

document.getElementsByClassName("singleplayer-dropdown-toggle")[0].onclick = event => {
    document.getElementsByClassName("singleplayer-dropdown-menu")[0].classList.toggle("collapse");
}