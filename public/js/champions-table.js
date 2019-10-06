(function (){
    const domain = "192.168.43.106";
    let currentTable = "users";
    let currentParam = null;
    let pagesLoaded = 0;
    let recordsBlock = document.getElementsByClassName("content-main-records")[0];
    let contentMain = document.getElementsByClassName("content-main")[0];
    let requestAlreadySent = false;
    let elemsOnPage = 20;

    loadRecords();
    recordsBlock.parentElement.onscroll = function(){
        if (recordsBlock.getBoundingClientRect().bottom > contentMain.getBoundingClientRect().bottom + 50)
            return;
        
        if (recordsBlock.children.length == pagesLoaded * elemsOnPage)
            loadRecords();
    }
    document.getElementsByClassName("content-page")[0].onclick = event => {
        let target = event.target;
        if (!target.classList.contains("records_button_delegation")) return;
        
        if (currentTable == target.getAttribute("table-name") && currentParam == target.getAttribute("param")) return;

        currentTable = target.getAttribute("table-name");
        currentParam = target.getAttribute("param");
        pagesLoaded = 0;
        recordsBlock.innerHTML = "";

        loadRecords();
    }
    function loadRecords() {

        let http = new XMLHttpRequest();
        http.open("GET", `/records/${currentTable}?page=${++pagesLoaded}${currentParam ? `&param=${currentParam}`: ""}`)
        http.setRequestHeader('Content-Type', 'application/json; charset=UTF-8')
        http.onreadystatechange = function() {
            
            if (this.status === 500) return error(500);

            if (this.readyState !== 4 || this.status !== 200) return;
            
            let response = JSON.parse(this.response);

            response.records.forEach((item, i) => {
                let elem = document.createElement("div");
                elem.classList.add("champions-table_record");

                elem.innerHTML += `<div class="champions-table_record_num"><div>${elemsOnPage * (response.page - 1)  + i + 1}</div></div>`
                elem.innerHTML += `<div class="champions-table_record_separator separator"></div>`
                elem.innerHTML += currentTable !== "recordstwoplayers" ? `<div class="champions-table_record_username username">${currentTable == "users" ? item.username : item.playerusername}</div>` : "";
                elem.innerHTML += currentTable === "users" ? `<div class="rank">${item.rank}</div>` : "";
                elem.innerHTML += currentTable === "recordstwoplayers" ? `<div class="champions-table_record_player1username">${item.player1username}</div>` : "";
                elem.innerHTML += currentTable === "recordstwoplayers" ? `<div class="champions-table_record_player2username">${item.player2username}</div>` : "";
                elem.innerHTML += currentTable !== "users" ? `<div class="champions-table_record_timems">${formatTimeMs(item.timems)}</div>` : "";
                elem.innerHTML += currentTable !== "users" ? `<div class="champions-table_record_date">${new Date(item.created_at).toStringLoc()}</div>` : "";

                recordsBlock.appendChild(elem);
            });
        };

        http.send();
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
    // 
    function formatTimeMs(timems){
        timems = timems / 1000;

        if (timems % 1 == 0) 
            return timems + ".000";
        
        return (timems + "00").slice(0, (timems + "00").indexOf('.') + 4);
    }
    Date.prototype.toStringLoc = function(){
        let ISO = this.toISOString();
        return ISO.slice(8, 10) + "." + ISO.slice(5,7) + "." + ISO.slice(0,4) + " " + ISO.slice(11,13) + ":" + ISO.slice(14,16);
    }
})()