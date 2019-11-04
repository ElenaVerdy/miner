(function (){
    let currentTable = "users";
    let currentParam = null;
    let pagesLoaded = 0;
    let recordsBlock = document.getElementsByClassName("content-main-records")[0];
    let contentMain = document.getElementsByClassName("content-main")[0];
    let elemsOnPage = 20;

    loadRecords(true);
    recordsBlock.parentElement.onscroll = function(){
        if (recordsBlock.getBoundingClientRect().bottom > contentMain.getBoundingClientRect().bottom + 50)
            return;
        
        if (recordsBlock.children.length - 1 == pagesLoaded * elemsOnPage)
            loadRecords();
    }
    document.getElementsByClassName("content-page")[0].onclick = event => {
        let target = event.target;
        if (!target.classList.contains("records_button_delegation")) return;
        
        if (currentTable == target.getAttribute("table-name") && currentParam == target.getAttribute("param")) return;

        currentTable = target.getAttribute("table-name");
        currentParam = target.getAttribute("param");
        pagesLoaded = 0;

        let bestBlockWrapper = document.getElementsByClassName("best-block-wrapper")[0]; 
        if (bestBlockWrapper) {
            bestBlockWrapper.parentElement.removeChild(bestBlockWrapper)
        }

        switch (currentTable) {
            case "users":
                recordsBlock.innerHTML =   `<div class="champions-table_record">
                                                <div class="champions-table_record_num"><div></div></div>
                                                <div class="champions-table_record_separator separator"></div>
                                                <div class="champions-table_record_username username">Username</div>
                                                <div class="rank">Rank</div>
                                            </div>`;
                
                break;

            case "recordstwoplayers":
                recordsBlock.innerHTML =   `<div class="champions-table_record">
                                                <div class="champions-table_record_num"><div></div></div>
                                                <div class="champions-table_record_separator separator"></div>
                                                <div class="champions-table_record_player1username">Player 1</div>
                                                <div class="champions-table_record_player2username">Player 2</div>
                                                <div class="champions-table_record_timems">Seconds</div>
                                                <div class="champions-table_record_date">Date</div>
                                            </div>`;
                break;
            
            case "recordssingleplayer":
                recordsBlock.innerHTML =   `<div class="champions-table_record">
                                                <div class="champions-table_record_num"><div></div></div>
                                                <div class="champions-table_record_separator separator"></div>
                                                <div class="champions-table_record_username username">Username</div>
                                                <div class="champions-table_record_timems">Seconds</div>
                                                <div class="champions-table_record_date">Date</div>
                                            </div>`;
                break;
        }

        loadRecords(true);
    }
    function loadRecords(getMyBest) {

        let http = new XMLHttpRequest();
        http.open("GET", `/records/${currentTable}?page=${++pagesLoaded}${currentParam ? `&param=${currentParam}`: ""}${getMyBest ? `&getMyBest=true`: "" }`)
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
                elem.innerHTML += currentTable === "users" ? `<div class="rank champions-table_record_rank">${item.rank}</div>` : "";
                elem.innerHTML += currentTable === "recordstwoplayers" ? `<div class="champions-table_record_player1username">${item.player1username}</div>` : "";
                elem.innerHTML += currentTable === "recordstwoplayers" ? `<div class="champions-table_record_player2username">${item.player2username}</div>` : "";
                elem.innerHTML += currentTable !== "users" ? `<div class="champions-table_record_timems">${formatTimeMs(item.timems)}</div>` : "";
                elem.innerHTML += currentTable !== "users" ? `<div class="champions-table_record_date">${new Date(item.created_at).toStringLoc()}</div>` : "";

                recordsBlock.appendChild(elem);
            });

            if (response.bestResult !== null) {
                if (typeof response.bestResult == "number"){
                    recordsBlock.children[response.bestResult + 1].classList.add("best-result");
                }

                if (typeof response.bestResult == "object") {
                    let elem = document.createElement("div");
                    elem.classList.add("champions-table_record", "best-result");
                    
                    let item = response.bestResult;

                    elem.innerHTML += `<div class="champions-table_record_num"><div>${item.num + 1}</div></div>`
                    elem.innerHTML += `<div class="champions-table_record_separator separator"></div>`
                    elem.innerHTML += currentTable !== "recordstwoplayers" ? `<div class="champions-table_record_username username">${currentTable == "users" ? item.username : item.playerusername}</div>` : "";
                    elem.innerHTML += currentTable === "users" ? `<div class="rank champions-table_record_rank">${item.rank}</div>` : "";
                    elem.innerHTML += currentTable === "recordstwoplayers" ? `<div class="champions-table_record_player1username">${item.player1username}</div>` : "";
                    elem.innerHTML += currentTable === "recordstwoplayers" ? `<div class="champions-table_record_player2username">${item.player2username}</div>` : "";
                    elem.innerHTML += currentTable !== "users" ? `<div class="champions-table_record_timems">${formatTimeMs(item.timems)}</div>` : "";
                    elem.innerHTML += currentTable !== "users" ? `<div class="champions-table_record_date">${new Date(item.created_at).toStringLoc()}</div>` : "";
    
                    let bestBlockWrapper = document.createElement("div");
                    bestBlockWrapper.classList.add("best-block-wrapper");
                    bestBlockWrapper.appendChild(elem);

                    let hr = document.createElement("hr");
                    hr.classList.add("best-result-separator");

                    bestBlockWrapper.appendChild(hr)

                    recordsBlock.parentElement.insertBefore(bestBlockWrapper, recordsBlock);
                        
                }
            }

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