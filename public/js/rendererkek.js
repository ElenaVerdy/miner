let table = document.getElementById("table");
let fieldSize = document.getElementById("fieldSize");
let width, height, num;

function setMinesLeft(){
    let minesLeft = document.getElementsByClassName("mines-left")[0];

    minesLeft.innerHTML = `<span>${table.getElementsByClassName("mine").length - 
                document.getElementsByClassName("flag").length}</span>`;
}
//<server code>
function checkForTheWin(){
    if (table.getElementsByClassName("cell-closed").length === table.getElementsByClassName("mine").length) return true;

    if (table.getElementsByClassName("flag").length !== table.getElementsByClassName("mine").length) return false;

    return [].slice.call(table.getElementsByClassName("flag")).every(item=>{
        if (item.classList.contains("mine")) return true;  
    });
}
//</server code>
function congratulations(){
    table.onmousedown = fieldSize.onchange;
    
}

function fieldBuilder(){

    switch (+fieldSize.value) {
        case 0:
            width = height = 10;
            num = 10;
            break;
        case 1:
            width = 18
            height = 16;
            num = 40;
            break;
        case 2: 
            width = 24;
            height = 20;
            num = 100;
            break;
    }
    table.parentElement.className = "playing-area";
    table.parentElement.classList.add(fieldSize.options[fieldSize.selectedIndex].text);

    let tableInnerHTML = '';
    for (let i = 0; i < height; i++) {
        tableInnerHTML += "<tr>";
        
        for (let k = 0; k < width; k++) {
            tableInnerHTML += `<td class="cell cell-closed"></td>`;
        }

        tableInnerHTML += "</tr>";

    }
    table.innerHTML = tableInnerHTML;
    table.onmousedown = tableClickHandler;
};

let tableClickHandler = event => {

    if (!event.target.classList.contains("cell-closed")) return;

    if (event.button === 2) {
        event.target.classList.toggle("flag");
        setMinesLeft();
        if (checkForTheWin()) congratulations();
        
        return;
    }

    if (event.target.classList.contains("flag")) return;

    let field = [].slice.call(document.getElementsByClassName("cell"));

    if (!document.getElementsByClassName("cell-opened").length) {

        minesOnTheField = [];
        for (let i = 0; i < num; i++) {
            minesOnTheField.push(true);
        }

        for (let i = 0; i < width * height - num; i++) {
            minesOnTheField.push(0);
        }

        do {
            minerOnTheField = minesOnTheField.sort(()=>{return Math.random()-0.5});
        } while (minesOnTheField[field.indexOf(event.target)])


        for (let j = 0; j < field.length; j++) {
            if (minesOnTheField[j]) field[j].classList.add("mine");
        }

        for (var i = 0; i < minesOnTheField.length; i++) {
            if (minesOnTheField[i] !== true) continue;

            if (i % width && minesOnTheField[i - 1] !== true) minesOnTheField[i - 1]++;
            if (i % width !== width - 1 && minesOnTheField[i + 1] !== true) minesOnTheField[i + 1]++;
            if (i > width-1 && minesOnTheField[i - width] !== true) minesOnTheField[i - width]++;
            if (i < width * (height - 1) && minesOnTheField[i + width] !== true) minesOnTheField[i + width]++;

            if (i > width - 1 && i % width && minesOnTheField[i - width - 1] !== true) minesOnTheField[i - width - 1]++;
            if (i > width - 1 && i % width !== width - 1 && minesOnTheField[i - width + 1] !== true) minesOnTheField[i - width + 1]++;
            if (i < width * (height - 1) && i % width && minesOnTheField[i + width - 1] !== true) minesOnTheField[i + width - 1]++;
            if (i < width * (height - 1) && i % width !== width - 1 && minesOnTheField[i + width + 1] !== true) minesOnTheField[i + width + 1]++;
            
        };

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
                tbody.children[targetRow].children[targetColumn].innerHTML = minesOnTheField[next];
                continue;
            }

            if (next % width) ~visited.indexOf(next - 1) ? "" : queue.push(next - 1);                
            if (next % width !== width - 1) ~visited.indexOf(next + 1) ? "" : queue.push(next + 1);
            if (next > width-1) ~visited.indexOf(next - width) ? "" : queue.push(next - width);
            if (next < width * (height - 1)) ~visited.indexOf(next + width) ? "" : queue.push(next + width);

            if (next > width - 1 && next % width) ~visited.indexOf(next - width - 1) ? "" : queue.push(next - width - 1);
            if (next > width - 1 && next % width !== width - 1) ~visited.indexOf(next - width + 1) ? "" : queue.push(next - width + 1);
            if (next < width * (height - 1) && next % width) ~visited.indexOf(next + width - 1) ? "" : queue.push(next + width - 1);
            if (next < width * (height - 1) && next % width !== width - 1 && minesOnTheField[next + width + 1]) ~visited.indexOf(next + width + 1) ? "" : queue.push(next + width + 1);

        }

    }

    function gameOver(){

        minerOnTheField.forEach((item, i) => {
            if (item !== true) return;
            if (!field[i].classList.contains("mine")) return;

            field[i].classList.add("exploded");
            table.onmousedown = "";
        });

    }

    if (event.target.classList.contains("mine")) {

        event.target.classList.remove("mine");
        event.target.classList.add("wrong-move");
        gameOver();

    } else {

        openTheCell(event);
        setMinesLeft();
        if (checkForTheWin()) congratulations();

    }
};

table.oncontextmenu = ()=>{return false};
table.ondragstart = ()=>{return false};

table.onmousedown = tableClickHandler; 
fieldSize.onchange = fieldBuilder;

fieldSize.onchange();
