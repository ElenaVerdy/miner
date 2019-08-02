function multiPlayerInit(socket) {

    const table = document.getElementById("table");
    const field = [].slice.call(document.getElementsByClassName("cell"));
    const gameId = document.getElementById("table").getAttribute("gameId");
    let countDown = new Timer();
    let minesLeft = new MinesLeft();

    function fieldUpdate(fieldUpdate){
        console.log(fieldUpdate)
        for (cellNum in fieldUpdate) {
            fieldUpdate[cellNum]["cell-closed"] === false ? field[cellNum].classList.remove("cell-closed") : "";
            fieldUpdate[cellNum]["cell-opened"] ? field[cellNum].classList.add("cell-opened") : field[cellNum].classList.remove("cell-opened");
            fieldUpdate[cellNum].flag ? field[cellNum].classList.add("flag", fieldUpdate[cellNum].flag) : field[cellNum].classList.remove("flag", "flag1", "flag2");
            fieldUpdate[cellNum].num ? field[cellNum].innerHTML = fieldUpdate[cellNum].num : "";
        }
        minesLeft.setCurrent();
    }

    socket.on("fieldUpdated", data => {
        if (data.firstMove) countDown.start();
        fieldUpdate(data.fieldUpdate);

        if (data.player1touches) document.getElementsByClassName("player1touches")[0].innerHTML = data.player1touches;
        if (data.player2touches) document.getElementsByClassName("player2touches")[0].innerHTML = data.player2touches;
    });

    socket.on("error", data =>{
        console.log("error")
    })

    socket.on("gameOver", data => {
        for (cell in data.fieldUpdate) {
            field[cell].classList.add("exploded");
        }
        field[data.wrong].classList.add("wrong-move");  
    })

    socket.on("resultsReady", data => {
        document.getElementById("gameResults").style.display = "block";
        document.getElementsByClassName("game-result")[0].innerHTML = "Congratulations";
        document.getElementsByClassName("records")[0].innerHTML = data.result.reduce((sum, current, i) => {
            if (i == 10) sum += `<div class="break">.  .  .</div>`

            return sum + `<div class="record-item ${current.isCurrentGame ? "current-game": ""}">
                        <div class="record-item_num"><div class="float_right">${current.isCurrentGame ? current.num + 1 : i + 1}</div></div>
                        <div class="record-item_gameId">${current.gameid}</div>
                        <div class="record-item_player1username">${current.player1username}</div>
                        <div class="record-item_player2username">${current.player2username}</div>
                        <div class="record-item_timems"><div class="float_right">${current.timems.toString().slice(0, -3) + "." + current.timems.toString().slice(-3)}</div></div>
                        <div class="record-item_date">${new Date(current.created_at).toStringLoc()}</div>
                    </div>`;
        }, `<div class="record-item records-header">
                <div class="record-item_num"></div>
                <div class="record-item_gameId">Game Id</div>
                <div class="record-item_player1username">Player 1</div>
                <div class="record-item_player2username">Player 2</div>
                <div class="record-item_timems">Time</div>
                <div class="record-item_date">Date</div>
            </div>
            <div class="records-wrapper">`)
    }) + "</div>";
    
    table.onmousedown = tableClickHandler;

    function MinesLeft(){
        let minesLeft = document.getElementsByClassName("mines-left")[0];
        let start = +minesLeft.innerHTML;

        this.setCurrent = ()=>{
            minesLeft.innerHTML = start - document.getElementsByClassName("flag").length;
        }
    }

    function tableClickHandler(event){

        if (!event.target.classList.contains("cell-closed")) return;

        if (event.button === 2) return;

        if (event.target.classList.contains("flag")) return;

        if (!document.getElementsByClassName("cell-opened").length) {
            
            socket.emit("gameStart", {
                cellId: field.indexOf(event.target),
                gameId: gameId
            })
        return;
        }

        socket.emit("cell-opened", {cellId: field.indexOf(event.target),
                                    gameId: gameId});
    }

    table.onmousedown = tableClickHandler; 
    table.oncontextmenu = (event)=>{
        if (!event.target.classList.contains("cell-closed")) return false;
        if (!document.getElementsByClassName("cell-opened").length) return false;

        socket.emit("flag", {
            [field.indexOf(event.target)] : !event.target.classList.contains("flag"),
            gameId: gameId
        });

        return false;
    };
    table.ondragstart = ()=>{return false};
}
function Timer(){
    let timer = document.getElementsByClassName("timer")[0];
    let current = 999;
    let timerId;

    this.start = () => {
        timer.innerHTML = current = 999;
        timerId = setInterval(() => timer.innerHTML = current--, 1000)
    };
    this.default = () =>{
        timer.innerHTML = current = 999;
    }
    this.stop = () => {
        clearTimeout(timerId);
    }
}