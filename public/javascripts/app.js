////////////////////// PUBLIC FUNCTIONS BELOW HERE ///////////////////
//////////////////////////////////////////////////////////////////////
//Comment: I should have used Angular for this, I will need to refactor the code....
//

//This is executed one domload.
var start = function() {
    hideAllScreens();  //This is needed if start is called not at domload but after.

    //Call the backend and figure out what state it is in.
    api_status(function(data){

        //Lets check to see if backend is busy doing something
        if (data.status == 'busy'){
            $('#busyEnc').show();
            checkbusy(); //Keep Checking if it's busy, will call start again when it is not busy.
            return;
        }

        //Check to see if the backend CA been initialized.
        if (data.init == false) {
            console.log('CA not yet initialized');
            $('#init').show();
        } else {
            console.log('CA is READY');
            $('#busyEnc').hide();
            $('#init').hide();

            //Let's check to see if clients have been created before.
            api_getClients( function (data){
                // If CA has not clients, show the generate new client page
                if ( data === undefined || data === null || data == "") {
                    $('#genClient').show();
                } else {
                    // If CA has already clients, show the clients
                    var out = '';
                    for (var i=0; i<data.length; i++) {
                        out += '<p class="displayData"><a href="/api/getclientovpnconfig/' + data[i] + '">' + data[i]  + '</a></p>'
                    }
                    $('#clientLinks').append(out);
                    $('#showClients').show();
                }
            });
        }
    });
};

//This function is for initializing the CA, Generting keys and certs
var init = function() {
    var pass1 = document.getElementById("pw1").value;
    var pass2 = document.getElementById("pw2").value;

    if (pass1 == pass2) {
        capassword = pass1;
        $('#init').hide();
        $('#busyEnc').show();
        api_init(pass1, function(){
            //nothing
        });
        checkbusy();
    } else {
        console.log ('Passwords do not match');
        $("#initButtonDiv").effect( "shake" );
        return;
    }
};

// Check the password box's match on the init page.
var checkpw = function(){
    var pass1 = document.getElementById("pw1").value;
    var pass2 = document.getElementById("pw2").value;

    if (pass1 == pass2) {
        $("#pw1").css({"color":"green"});
        $("#pw2").css({"color":"green"});

    }else{
        $("#pw1").css({"color":"black"});
        $("#pw2").css({"color":"red"});

    }
};

//To Generate new Clients.
var genovpn = function() {
    var cn = document.getElementById("commonname").value;
    var pw = document.getElementById("capassword").value;
    if ( ! cn || ! pw ){  //If one of the fields is empty
        $("#genButtonDiv").effect( "shake" );
    } else { // We have common name and password, let's create client

        $("#genClient").hide();
        $('#busy').show();

        $.ajax({
            type: 'POST',
            url: '/api/createclient',
            data: {name: cn, capassword: pw},
            success: function (data) {
                console.log('success', data);

                //This does the download in a hidden iframe.
                document.getElementById('hiddeniframe').src = '/api/getclientovpnconfig/' + cn;

                $("#busy").hide();
                $("#complete").show();
            },
            error: function (err) {
                alert(JSON.stringify(err.responseJSON, null, 4));
                start();
            }
        });
    }
};

///////////////////////// PRIVATE FUNCTIONS BELOW HERE ///////////////////
//////////////////////////////////////////////////////////////////////////


// This function keeps checking when CA is creating certificates.
var checkbusy = function() {
    api_status(function(data) {
        console.log(data);
        if (data.status == 'busy') {
            $('#busyEnc').show();
            console.log('checkbusy');
            setTimeout(function(){
                checkbusy();
            }, 5000);

        }else {
            console.log('Start Triggered');
            start();
        }
    });
};

// Private Function: Show the screen to generate new clients.
var showGenNewClientScreen = function () {
    $('#busyEnc').hide();
    $('#init').hide();
    $('#complete').hide();
    $('#showClients').hide();
    $('#genClient').show();
};

var hideAllScreens = function() {
    $('#busyEnc').hide();
    $('#busy').hide();
    $('#init').hide();
    $('#complete').hide();
    $('#showClients').hide();
    $('#genClient').hide();
}

//API Call to initialize the server
var api_init = function(pw, callback) {
    $.ajax({
        type: 'POST',
        url: '/api/init',
        data: { capassword: pw},
        success: function(data){
            //console.log('success', data);
            callback(data);
        }

    });
};

//API Call to get the Status
var api_status = function(callback) {
    $.ajax({
        type: 'GET',
        url: '/api/status',
        success: function(data){
            //console.log('success', data);
            callback(data);
        }
    });
};

//API Call to get list of existing Clients
var api_getClients = function(callback) {
    $.ajax({
        type: 'GET',
        url: '/api/getclientovpnconfig',
        success: function (data) {
            callback(data);
        }
    });
};

document.onload = start();

