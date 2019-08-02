let address = "http://192.168.1.64:3000";
let socket = io.connect(address);

Date.prototype.toStringLoc = function(){
    let ISO = this.toISOString();
    return ISO.slice(8, 10) + "." + ISO.slice(5,7) + "." + ISO.slice(0,4) + " " + ISO.slice(11,13) + ":" + ISO.slice(14,16);
}

document.getElementsByClassName("new-game")[0].addEventListener("click", newGameModal);

document.getElementById("new-game-modal").addEventListener("click", event => {
    if (!event.target.classList.contains("modal")) return;
    event.currentTarget.style.display = "none"; 
}, false);

function newGameModal(event){

    document.getElementById("new-game-modal").style.display = "block";

    document.getElementById("game-mode").onchange = event => {

        if (event.currentTarget.value === "multiplayer") {
            document.getElementsByClassName("for-singleplayer")[0].classList.add("collapse");
            document.getElementsByClassName("for-multiplayer")[0].classList.remove("collapse");
        } else {
            document.getElementsByClassName("for-singleplayer")[0].classList.remove("collapse");
            document.getElementsByClassName("for-multiplayer")[0].classList.add("collapse");
        }
    }
}

const error500 = () => {
    let errorMsg = document.getElementById("authorizationServerError");
                
    errorMsg.style.display = "block";
    errorMsg.onclick = () => {
        errorMsg.style.display = "none";
    }
}

document.getElementsByClassName("start-game")[0].onclick = event => {
    let http = new XMLHttpRequest();

    http.open("POST", `${address}/newgame`);
    http.setRequestHeader('Content-Type', 'application/json; charset=UTF-8')
    http.onreadystatechange = function() {
        
        if (this.status === 500) return error500();
        
        if (this.readyState !== 4 || this.status !== 200) return;

        document.getElementsByClassName("content-page")[0].innerHTML = this.response;

        s = document.createElement("script");       
        if (document.getElementById("game-mode").value === "singleplayer") {
            s.setAttribute("src", "/js/clientSinglePlayer.js");

        } else {
            s.setAttribute("src", "/js/clientMultiPlayer.js");
            document.getElementById("waitingForOtherPlayer").style.display = "block";
        }
        document.body.appendChild(s);
        s.onload = () => {
            if (s.getAttribute("src") == "/js/clientSinglePlayer.js") return;
            
            multiPlayerInit(socket, "player1");
            socket.emit("join", {gameId: document.getElementById("table").getAttribute("gameId"),
                                 username: document.querySelector(".player1info .username").innerHTML});
        }
        
        document.getElementById("new-game-modal").style.display = "none";
        
    };

    http.send(JSON.stringify({
        singlePlayer: document.getElementById("game-mode").value === "singleplayer",
        forAuthorizedOnly: document.getElementById("forAuthorizedPlayers").checked,
        fieldSize: document.getElementById("field-size").value
    }));

}
document.getElementsByClassName("tables")[0].onclick = event => {
    if (!event.target.classList.contains("join-button")) return;

    let http = new XMLHttpRequest();

    http.open("POST", `${address}/join`);
    http.setRequestHeader('Content-Type', 'application/json; charset=UTF-8')
    http.onreadystatechange = function() {
        
        if (this.status === 500) return error500();
        
        if (this.readyState !== 4 || this.status !== 200) return;

        document.getElementsByClassName("content-page")[0].innerHTML = this.response;

        s = document.createElement("script");       

        s.setAttribute("src", "/js/clientMultiPlayer.js");
        document.getElementById("waitingForOtherPlayer").style.display = "block";

        document.body.appendChild(s);
        s.onload = () => {
            multiPlayerInit(socket);

            socket.emit("join", {gameId: event.target.getAttribute("gameId"),
                                 username: document.querySelector(".player2info .username").innerHTML});
        
            if (event.target.classList.contains("continue")) {
                socket.emit("getFieldInfo", {gameId: event.target.getAttribute("gameId")})   
            }

        }
        
        document.getElementById("new-game-modal").style.display = "none";
        
    };

    http.send(JSON.stringify({
        gameId: event.target.getAttribute("gameId")
    }));
}
function updatePlayersInfo(playersInfo) {
    if (playersInfo.player1) { 
        document.querySelector(".player1info .avatar").setAttribute("src", playersInfo.player1.avatar);
        document.querySelector(".player1info .rank").innerHTML = playersInfo.player1.rank;
        document.querySelector(".player1info .username").innerHTML = playersInfo.player1.name || playersInfo.player1.username;
    }
    if (playersInfo.player2) { 
        document.querySelector(".player2info .avatar").setAttribute("src", playersInfo.player2.avatar);
        document.querySelector(".player2info .rank").innerHTML = playersInfo.player2.rank;
        document.querySelector(".player2info .username").innerHTML = playersInfo.player2.name || playersInfo.player2.username;
    } else {
        document.querySelector(".player2info .avatar").setAttribute("src", "/images/waiting.png");
        document.querySelector(".player2info .rank").innerHTML = 9999;
        document.querySelector(".player2info .username").innerHTML = "Player 2";
    } 
}

socket.on("playersInfoUpdated", data=>{updatePlayersInfo(data)});

socket.on("ready", data => {
    updatePlayersInfo(data);

    document.getElementsByClassName("waitingForOtherPlayer")[0].innerHTML = `
    <h1>Game is going to start in: <span class="start-countdown">1</span></h1>
    `;
    let startCountdown = document.getElementsByClassName("start-countdown")[0];
    let timer = setInterval(()=>{
        if (!document.getElementsByClassName("start-countdown")[0]) {
            clearInterval(timer);
            return;                   
        }
        if (startCountdown.innerHTML == 1) {
            clearInterval(timer);
            document.getElementById("waitingForOtherPlayer").style.display = "none";    
        }
        startCountdown.innerHTML = startCountdown.innerHTML - 1;
    }, 1000)
})
socket.on("playerLeftBeforeTheGameStarted", data => {
    updatePlayersInfo(data);

    document.getElementsByClassName("waitingForOtherPlayer")[0].innerHTML = `
        <h1>Looking for other player.</h1>
        <button class="back-to-tables">back</button>
    `;
})

