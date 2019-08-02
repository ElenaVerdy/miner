let Authorization = function(){
    let address = "http://192.168.1.64:3000";
    
    let auth = this;

    const warningTimers = {};        
    let DOM = {
        warnings: {
            badLogin:           document.getElementsByClassName("bad-login")[0],
            badPassword:        document.getElementsByClassName("bad-password")[0],
            badEmail:           document.getElementsByClassName("bad-email")[0],
            passwordsDontMatch: document.getElementsByClassName("passwords-dont-match")[0],
            nameTaken:          document.getElementsByClassName("name-taken")[0],
            emailTaken:         document.getElementsByClassName("email-taken")[0],
            badCredentials:     document.getElementsByClassName("bad-credentials")[0]
        },
        inputs: {
            loginBtn:           document.getElementsByClassName("log-in-btn")[0],
            signUpBtn:          document.getElementsByClassName("sign-up-btn")[0],
            login:              document.getElementById("loginInput"),
            password:           document.getElementById("passwordInput"),
            passwordRepeat:     document.getElementById("password-repeat"),
            email:              document.getElementById("emailInput")
        },
        other: {
            btnWrapper:         document.getElementsByClassName("btn-wrapper")[0],
            backToLogin:        document.getElementsByClassName("back-to-log-in")[0]
        }
    }

    let isSignUpModeOn = false;
    
    let forSigningUpElements = [].slice.call(document.getElementsByClassName("for-signing-up"));
    var validation = new Validation();
    validation.init();

    this.setSignUpMode = function(boolean){
        if (boolean) {
            forSigningUpElements.forEach(item=> item.classList.remove("collapse"));
            DOM.inputs.loginBtn.classList.add("collapse");
            DOM.other.btnWrapper.classList.remove("btn-group");
            DOM.inputs.signUpBtn.classList.add("full-width");
        } else {
            forSigningUpElements.forEach(item=> item.classList.add("collapse"));
            DOM.inputs.loginBtn.classList.remove("collapse");
            DOM.other.btnWrapper.classList.add("btn-group");
            DOM.inputs.signUpBtn.classList.remove("full-width");

        }
        isSignUpModeOn = boolean;
    };

    const error500 = () => {
        let errorMsg = document.getElementById("authorizationServerError");
                    
        errorMsg.style.display = "block";
        errorMsg.onclick = () => {
            errorMsg.style.display = "none";
        }
    }

    let signUpBtnHandler = event => {
        if (isSignUpModeOn) {
            if (!validation.finalValidation()) return;
                        
            let http = new XMLHttpRequest();

            http.open("POST", `${address}/reg`);
            http.setRequestHeader('Content-Type', 'application/json; charset=UTF-8')
            http.onreadystatechange = function() {
                
                if (this.status === 500) return error500();

                if (this.status === 444){
                    DOM.inputs.login.onblur({target: DOM.inputs.login});
                    return;  
                }
                
                if (this.status === 466){
                    DOM.inputs.email.onblur({target: DOM.inputs.email});   
                    return; 
                }
                
                if (this.readyState !== 4 || this.status !== 200) return;
                
                auth.setSignUpMode(false);

                DOM.inputs.login.value = "";
                DOM.inputs.password.value = "";
                DOM.inputs.passwordRepeat.value = "";
                DOM.inputs.email.value = "";

            };

            http.send(JSON.stringify({
                username: DOM.inputs.login.value,
                password: DOM.inputs.password.value,
                email: DOM.inputs.email.value
            }));

        } else {
            auth.setSignUpMode(true);
            event.currentTarget.removeEventListener("click", signUpBtnHandler);    
        }
        
    };
    
    let loginBtnHandler = event => {
        if (!validation.finalValidation()) return badCredentials();

        let http = new XMLHttpRequest();
        http.open("POST", `${address}/login`);
        http.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');

        http.onreadystatechange = function() {
            if (this.status === 401) return badCredentials();
            if (this.status === 500) return error500();
            if (this.readyState !== 4 || this.status !== 200) return;
            
            window.location.reload();
        }
        http.send(JSON.stringify({
            username: DOM.inputs.login.value,
            password: DOM.inputs.password.value,
        }));
    }

    function badCredentials() {
        DOM.warnings.badCredentials.classList.remove("collapse")
        warningTimers["bad-credentials"] = setTimeout(()=>{DOM.warnings.badCredentials.classList.add("collapse")}, 3500);
    }

    this.init = function(){
        
        DOM.inputs.signUpBtn.addEventListener("click", signUpBtnHandler);
        DOM.inputs.loginBtn.addEventListener("click", loginBtnHandler);
        DOM.other.backToLogin.onclick = ()=>{
            validation.clearAlerts();
            auth.setSignUpMode(false);
            DOM.inputs.signUpBtn.addEventListener("click", signUpBtnHandler);
            return false;
        }
        
    }
    
    
    function Validation() {

        var validSelf = this;

        function validate(input, rexExp, warning, str) {
            if (!input.value || !rexExp.test(input.value.toString().toLowerCase())) {
                if (isSignUpModeOn) invalidInput(input, warning, str);
                return false;
            }  
            return true;
        };
        
        this.clearAlerts = () => {

            Object.keys(DOM.warnings).forEach(item => {
                DOM.warnings[item].classList.add("collapse")
            })
            Object.keys(warningTimers).forEach(item => {
                clearTimeout(warningTimers[item]);
                delete warningTimers[item];
            })
        };
        
        function invalidInput(input, warning, str){
            input.classList.add("invalidInput");
            setTimeout(()=>{input.classList.remove("invalidInput")}, 1100);

            if (!warning) return;

            validSelf.clearAlerts();

            warning.classList.remove("collapse")
            warningTimers[str] = setTimeout(()=>{warning.classList.add("collapse")}, 3500);
        };
        
        this.finalValidation = function(){
            let isAllDataValid = true;

            isAllDataValid = isAllDataValid ? validate(DOM.inputs.login, 
                                                       /^[0-9a-z_]+$/,
                                                       DOM.warnings.badLogin, 
                                                       "bad-login") : isAllDataValid;
            isAllDataValid = isAllDataValid ? validate(DOM.inputs.password, 
                                                       /^[0-9a-z]+$/,
                                                       DOM.warnings.badPassword,
                                                       "bad-password") : isAllDataValid;
                    
            if (!isSignUpModeOn) return isAllDataValid

            if (isAllDataValid && DOM.inputs.password.value !== DOM.inputs.passwordRepeat.value) {
                invalidInput(DOM.inputs.passwordRepeat, 
                             DOM.warnings.passwordsDontMatch,
                             "passwords-dont-match");
                
                isAllDataValid = false;
            }
                     
            isAllDataValid = isAllDataValid ? validate(DOM.inputs.email, 
                                                       /^([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z]{2,5})$/,
                                                       DOM.warnings.badEmail,
                                                       "bad-email") : isAllDataValid;

            return isAllDataValid;
        };
        
        this.init = function(){
            DOM.inputs.login.onblur = event =>{
                if (!isSignUpModeOn) return;
    
                validSelf.clearAlerts();

                if (!validate(event.target, /^[0-9a-z_]+$/, DOM.warnings.badLogin, "bad-login")) return;

                let http = new XMLHttpRequest();

                http.open("POST", `${address}/check`);
                http.setRequestHeader('Content-Type', 'application/json; charset=UTF-8')
                http.onreadystatechange = function() {
                    if (this.readyState !== 4 || this.status !== 200) return;
                    if (!JSON.parse(this.response).length) return;

                    invalidInput(DOM.inputs.login, 
                                 DOM.warnings.nameTaken, 
                                 "name-taken");    
                };
                http.send(JSON.stringify({
                    field: "username",
                    value: DOM.inputs.login.value
                }));
            }

            DOM.inputs.password.onblur = event =>{
                if (!isSignUpModeOn) return;
                validSelf.clearAlerts();
                validate(event.target, /^[0-9a-z]+$/, DOM.warnings.badPassword, "password");
            }

            DOM.inputs.passwordRepeat.onblur = () =>{
                if (!isSignUpModeOn) return;
                validSelf.clearAlerts();

                if (DOM.inputs.password.value === DOM.inputs.passwordRepeat.value) return;

                DOM.warnings.passwordsDontMatch.classList.remove("collapse");
                warningTimers["password-repeat"] = setTimeout(()=>{
                    DOM.warnings.passwordsDontMatch.classList.add("collapse")
                }, 3500);
            }

            DOM.inputs.email.onblur = event =>{
                if (!isSignUpModeOn) return;
                validSelf.clearAlerts();
                
                if (!validate(event.target, 
                              /^([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z]{2,5})$/, 
                              DOM.warnings.badEmail, 
                              "bad-email")) return;

                let http = new XMLHttpRequest();
                http.open("POST", `${address}/check`);
                http.setRequestHeader('Content-Type', 'application/json; charset=UTF-8')
                http.onreadystatechange = function() {

                    if (this.readyState !== 4 || this.status !== 200) return;
                    if (!JSON.parse(this.response).length) return;

                    invalidInput(DOM.inputs.email, 
                                 DOM.warnings.emailTaken, 
                                 "email-taken");    
                    
                };
                http.send(JSON.stringify({
                    field: "email",
                    value: DOM.inputs.email.value
                }));
                  
            }
        }
    }
}   

var authorization = new Authorization();
authorization.init();