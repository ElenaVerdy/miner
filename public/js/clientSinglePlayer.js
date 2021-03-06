(function() {

    let startTimeMs, endTimeMs;
    let table = document.getElementById("table");
    let width, height, num;
    let minesOnTheField = [];
    let field = [].slice.call(document.getElementsByClassName("cell"));
    let player1touches = document.getElementsByClassName("player1touches")[0];
    let timer = new Timer;

    let isMainPage = !!document.getElementsByClassName("description")[0];

    function setMinesLeft(minesNum){
        let minesLeft = document.getElementsByClassName("mines-left")[0];
        if (minesNum === undefined) {
            var minesNum = num - document.getElementsByClassName("flag").length;
        }

        minesLeft.innerHTML = `<span>${minesNum}</span>`;
    }

    function checkForTheWin(){
        if (table.getElementsByClassName("cell-closed").length === num) return true;

        return false;
    }

    function gameRestart(){

        field.forEach(item => {
            item.innerHTML = "";
            item.className = "cell cell-closed";
            minesOnTheField.length = 0;
        });

        timer.stop();
        timer.default();
        setMinesLeft(num);
        player1touches.innerHTML = 0;
        table.onmousedown = tableClickHandler;
    }

    function congratulations(){
        endTimeMs = isMainPage ? new Date().valueOf() : ts.now();
        timer.stop();

        field.forEach(item => {
            item.classList.remove("cell-closed");
            item.classList.remove("flag");
            if (item.classList.contains("mine")) item.classList.add("mine-found");
        });
        setMinesLeft(0);

        if (isMainPage)
            return;

        let http = new XMLHttpRequest();

        http.open("POST", `${address}/new-singleplayer-record`);
        http.setRequestHeader('Content-Type', 'application/json; charset=UTF-8')
        http.onreadystatechange = function() {

            if (this.status === 500) return error(500);

            if (this.readyState !== 4 || this.status !== 200) return;

            let data = JSON.parse(this.response);

            document.getElementById("gameResults").style.display = "block";
            document.getElementsByClassName("ranks-change")[0].style.display = "none";
            document.getElementsByClassName("game-result")[0].innerHTML = "Congratulations";
            document.getElementsByClassName("records")[0].innerHTML = data.reduce((sum, current, i) => {
                if (i == 10 && current.num !== 10) sum += `<div class="break">.  .  .</div>`

                return sum + `<div class="record-item ${current.isCurrentGame ? "current-game": ""}">
                            <div class="record-item_num"><div class="float_right">${current.isCurrentGame ? current.num + 1 : i + 1}</div></div>
                            <div class="record-item_player1username">${current.playerusername}</div>
                            <div class="record-item_timems"><div class="float_right">${formatTimeMs(current.timems)}</div></div>
                            <div class="record-item_date">${new Date(current.created_at).toStringLoc()}</div>
                        </div>`;
            }, `<div class="record-item records-header">
                    <div class="record-item_num"></div>
                    <div class="record-item_player1username">Player</div>
                    <div class="record-item_timems">Time</div>
                    <div class="record-item_date">Date</div>
                </div>
                <div class="records-wrapper">`) + "</div>";
        };

        http.send(JSON.stringify({
            gameType: table.parentElement.getAttribute("fieldSize").toLowerCase(),
            timems: (endTimeMs - startTimeMs) ^ 0
        }));

    }
    function formatTimeMs(timems){
        timems = timems / 1000;

        if (timems % 1 == 0)
            return timems + ".000";

        return (timems + "00").slice(0, (timems + "00").indexOf('.') + 4);
    }
    let tableClickHandler = event => {

        if (!event.target.classList.contains("cell-closed")) return;

        if (event.button === 2) return;

        if (event.target.classList.contains("flag")) return;


        if (!document.getElementsByClassName("cell-opened").length) {

            timer.start();

            minesOnTheField = [];
            for (let i = 0; i < width * height; i++) {
                minesOnTheField.push(0);
            }

            for (let i = 0; i < num; i++) {
                let newMinePlace = (Math.random() * width * height) ^ 0;

                if (minesOnTheField[newMinePlace] === true || newMinePlace === field.indexOf(event.target)) {
                    i--;
                    continue;
                }
                minesOnTheField[newMinePlace] = true;
            }

            for (var i = 0; i < minesOnTheField.length; i++) {

                if (minesOnTheField[i] !== true) continue;

                let x = i % width,
                    y = (i / width)^0;

                for (let k = y > 0 ? y - 1 : y; k <= y + 1 && k < height; k++) {
                    for (var j = x > 0 ? x - 1 : x; j <= x + 1 && j < width; j++) {
                        
                        if (k * width + j === i || minesOnTheField[k * width + j] === true) continue;

                        minesOnTheField[k * width + j]++;
                    }
                }

            
            };

            for (let j = 0; j < field.length; j++) {
                if (minesOnTheField[j] === true) field[j].classList.add("mine");
            }
            startTimeMs = isMainPage ? new Date().valueOf() : ts.now();
        }

        function openTheCell(event){
            let tbody = table.firstElementChild;
            let targetNum = field.indexOf(event.target);
            let queue = [targetNum];
            let visited = [];

            while (queue.length) {

                let next = queue.pop();
                visited.push(next);
                let targetRow = next / width ^ 0;
                let targetColumn = next - targetRow * width;

                tbody.children[targetRow].children[targetColumn].classList.add("cell-opened");
                tbody.children[targetRow].children[targetColumn].classList.remove("cell-closed");
                tbody.children[targetRow].children[targetColumn].classList.remove("flag");

                if (minesOnTheField[next]) {
                    tbody.children[targetRow].children[targetColumn].innerHTML = `<div class="mines-around-num">${minesOnTheField[next]}</div>`;
                    continue;
                }

                let x = next % width,
                    y = (next / width)^0;
                
                for (let k = y > 0 ? y - 1 : y; k <= y + 1 && k < height; k++) {
                    for (var j = x > 0 ? x - 1 : x; j <= x + 1 && j < width; j++) {
                        
                        if (k * width + j === next) continue;
                        

                        if (!(~visited.indexOf(k * width + j))) {
                            queue.push(k * width + j);
                        }
                    }
                }
            }

        }

        function gameOver(){

            minesOnTheField.forEach((item, i) => {
                if (item !== true) return;
                if (!field[i].classList.contains("mine")) return;

                field[i].classList.add("exploded");
                table.onmousedown = "";
            });

            timer.stop();
        }

        if (event.target.classList.contains("mine")) {

            event.target.classList.remove("mine");
            event.target.classList.add("wrong-move");
            gameOver();

        } else {

            openTheCell(event);
            player1touches.innerHTML = +player1touches.innerHTML +1;

            if (checkForTheWin()) congratulations();

        }
    };

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
        };
        this.stop = () => {
            clearTimeout(timerId);
        };
        this.current = () => current;
    }

    table.oncontextmenu = ()=>{return false};
    window.ondragstart = ()=>{return false};
    window.onselectstart = ()=>{return false};

    table.oncontextmenu = (event)=>{
        if (!event.target.classList.contains("cell-closed")) return false;

        event.target.classList.toggle("flag");
        setMinesLeft();
        
        return false;
    };

    document.getElementsByClassName("restart")[0].onclick = gameRestart;

    if (document.querySelector(".game-result-btn.delegation_start-game.play-again")){
        document.querySelector(".game-result-btn.delegation_start-game.play-again").classList.add("delegation_start-game_singleplayer");
    }

    width = document.getElementsByTagName("tbody")[0].children[0].children.length; 
    height = document.getElementsByTagName("tbody")[0].children.length;

    switch (width) {
        case 8 :
            num = 10;
            break;
        case 10 :
            num = 15;
            break;
        case 16 :
            num = 49;
            break;
            
        case 30 :
            num = 99;
            break;    
    }

    table.onmousedown = tableClickHandler;
})()
