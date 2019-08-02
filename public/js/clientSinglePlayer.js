let table = document.getElementById("table");
let width, height, num;
let minesOnTheField = [];
let field = [].slice.call(document.getElementsByClassName("cell"));
let player1touches = document.getElementsByClassName("player1touches")[0];
let timer = new Timer;


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
    
    timer.stop();
    
    field.forEach(item => {
        item.classList.remove("cell-closed");
        item.classList.remove("flag");
        if (item.classList.contains("mine")) item.classList.add("mine-found");
    });
    setMinesLeft(0);
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
    }
    this.stop = () => {
        clearTimeout(timerId);
    }
}

if (document.getElementById("authorizationModal")) {
    (function(){
        let loginSpan = document.getElementsByClassName("log-in")[0];
        let signUnSpan = document.getElementsByClassName("sign-up")[0];
        let startAsGuest = document.getElementsByClassName("start-as-guest")[0];
        let authModal = document.getElementById("authorizationModal");

        authModal.addEventListener("click", event => {
            if (!event.target.classList.contains("modal")) return;
            authModal.style.display = "none"; 
        }, false);
    
    
        let loginSpanHandler = (boolean) => {
            authModal.style.display = "block";
            authorization.setSignUpMode(boolean);
            document.getElementsByName("login")[0].focus();
        };
        
        loginSpan.onclick = ()=>{loginSpanHandler(false)};
        signUnSpan.onclick =  ()=>{loginSpanHandler(true)};
    })();

    [].slice.call(document.getElementsByClassName("description")[0]
        .getElementsByTagName("a"))
        .forEach(item => {item.onclick = () => event.preventDefault()});

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
