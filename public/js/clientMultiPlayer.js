function Multiplayer(socket) {

    let table,
        field,
        gameId,
        countDown,
        minesLeft;

    let start = () => {
        if (table) table.onmousedown = null;

        table = document.getElementById("table");
        table.onmousedown = tableClickHandler;
        field = [].slice.call(document.getElementsByClassName("cell"));
        gameId = document.getElementById("table").getAttribute("gameId");
        countDown = new Timer();
        minesLeft = new MinesLeft();
    }

    this.startOver = start;

    start();

    function fieldUpdate(fieldUpdate){

        for (cellNum in fieldUpdate) {
            let cell = fieldUpdate[cellNum];
            let fieldCell = field[cellNum];

            cell["cell-closed"] === false   ? fieldCell.classList.remove("cell-closed")     : "";
            cell["cell-opened"]             ? fieldCell.classList.add("cell-opened")        : fieldCell.classList.remove("cell-opened");
            cell.flag                       ? fieldCell.classList.add("flag", cell.flag)    : fieldCell.classList.remove("flag", "flag1", "flag2");
            cell.num                        ? fieldCell.innerHTML = cell.num                : "";

            if (cell["cell-closed"] === false || cell["cell-opened"] || cell.num)
                fieldCell.classList.remove("flag", "flag1", "flag2");

        }
        minesLeft.setCurrent();
    }

    socket.on("fieldUpdated", data => {
        if (data.gameStart) countDown.start(data.gameStart);
        fieldUpdate(data.fieldUpdate);

        if (data.player1touches) document.getElementsByClassName("player1touches")[0].innerHTML = data.player1touches;
        if (data.player2touches) document.getElementsByClassName("player2touches")[0].innerHTML = data.player2touches;
    });

    socket.on("myError", data =>{
        console.log("myError: ", data);
    })

    socket.on("error", data => {
        console.log("error: ", data)
    })

    socket.on("gameOver", data => {
        for (cell in data.fieldUpdate) {
            field[cell].classList.add("exploded");
        }
        field[data.wrong].classList.add("wrong-move");
    })
    
    //(function(){
        let rankUpdateInfo

        socket.on("resultsReady", data => {

            document.getElementById("gameResults").style.display = "block";
            document.getElementsByClassName("game-result")[0].innerHTML = data.text;

            if (rankUpdateInfo)
                rankInfoUpdated(rankUpdateInfo);

            document.getElementsByClassName("records")[0].innerHTML = data.result.reduce((sum, current, i) => {
                if (i == 10 && current.num !== 10) sum += `<div class="break">.  .  .</div>`

                return sum + `<div class="record-item ${current.isCurrentGame ? "current-game": ""}">
                            <div class="record-item_num"><div class="float_right">${current.isCurrentGame ? current.num + 1 : i + 1}</div></div>
                            <div class="record-item_player1username">${current.player1username}</div>
                            <div class="record-item_player2username">${current.player2username}</div>
                            <div class="record-item_timems"><div class="float_right">${formatTimeMs(current.timems)}</div></div>
                            <div class="record-item_date">${new Date(current.created_at).toStringLoc()}</div>
                        </div>`;
            }, `<div class="record-item records-header">
                    <div class="record-item_num"></div>
                    <div class="record-item_player1username">Player 1</div>
                    <div class="record-item_player2username">Player 2</div>
                    <div class="record-item_timems">Time</div>
                    <div class="record-item_date">Date</div>
                </div>
                <div class="records-wrapper">`) + "</div>";
        }); 
        
        socket.on("rankUpdated", rankInfoUpdated);
        function rankInfoUpdated(data){
            
            if (!document.getElementsByClassName("ranks-change")[0].offsetParent) {
                rankUpdateInfo = data;
            } else {

                document.getElementsByClassName("ranks-change-info_username-player1")[0].innerHTML = data.player1.username; 
                document.getElementsByClassName("ranks-change-info_username-player2")[0].innerHTML = data.player2.username;

                document.getElementsByClassName("ranks-change-info_touches_player1")[0].innerHTML = data.player1.touches; 
                document.getElementsByClassName("ranks-change-info_touches_player2")[0].innerHTML = data.player2.touches; 

                document.getElementsByClassName("rank-change_added_player1")[0].innerHTML = 
                document.getElementsByClassName("rank-subtracted_player1")[0].innerHTML   =
                document.getElementsByClassName("rank-change_added_player2")[0].innerHTML =
                document.getElementsByClassName("rank-subtracted_player2")[0].innerHTML   = "";

                if (data.player1.delta !== undefined) {
                    if (data.player1.delta >= 0) {
                        document.getElementsByClassName("rank-change_added_player1")[0].innerHTML = data.player1.delta; 
                    } else {
                        document.getElementsByClassName("rank-subtracted_player1")[0].innerHTML = Math.abs(data.player1.delta);                     
                    }
                }

                if (data.player2.delta !== undefined) {
                    if (data.player2.delta >= 0) {
                        document.getElementsByClassName("rank-change_added_player2")[0].innerHTML = data.player2.delta; 
                    } else {
                        document.getElementsByClassName("rank-subtracted_player2")[0].innerHTML = Math.abs(data.player2.delta);                     
                    }
                }

                rankUpdateInfo = null;
            }
    
        }
    //})()
    function formatTimeMs(timems){
        timems = timems / 1000;
    
        if (timems % 1 == 0) 
            return timems + ".000";
        
        return (timems + "00").slice(0, (timems + "00").indexOf('.') + 4);
    }
    
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
    
    table.parentElement.parentElement.parentElement.oncontextmenu = (event)=>{
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
    let timerId, outerTimerId;
/*

outerTimer = setTimeout(function(){
    
    timer = setInterval(()=>{
        if (!timerHTML.offsetParent) {
            clearInterval(timer);
            clearTimeout(outerTimer);
            return;                   
        }
        
        timerHTML.innerHTML = timerHTML.innerHTML - 1;
    }, 1000)
}, msLeft % 1000);

*/
    this.start = (startTime) => {
        let msLeft = startTime + 999000 - ts.now(); 
        timer.innerHTML = current = msLeft / 1000 ^ 0;
        
        outerTimerId = setTimeout(function(){
            timerId = setInterval(() => timer.innerHTML = current--, 1000)
        }, msLeft % 1000)
    };
    this.default = () =>{
        timer.innerHTML = current = 999;
    }
    this.stop = () => {
        clearInterval(timerId);
        clearTimeout(outerTimerId);
    }
}
