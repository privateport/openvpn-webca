var exec = require('child_process').exec;
var fs = require('fs');
var path = require('path');
var async = require('async');
var scrypt = require("scrypt");

var mystatus = {
    init: false,
    status: 'idle'
};

//Let's see the state of the CA
var serversslfiles = [ 'ca.crt', 'dh2048.pem', 'server.cnf', 'server.crt', 'server.key', 'ta.key' ];
var casslfiles = ['ca-sign.cnf','DOMAIN.txt','ca.cnf','ca.key','ca.crt'];

var tmppwpath = "/tmp/pw.txt";
var caconfigdir = "/persistant/openssl";
var openvpnssldir = "/mnt/securefwd-openvpn.openssl"

//Chaining the ASync Calls (Async Heaven)
//Check to see if the files are already created on the fs to set the state.
var cafilesmissing = false;
var serverfilesmissing = false;
async.each(serversslfiles,function(filename,callback){
    fs.exists(caconfigdir+'/server/'+filename,function(exists){
        if(!exists){
            serverfilesmissing=true;
            callback();
        } else{
            callback();
        }
    });
},function(){
    async.each(casslfiles,function(filename,callback){
        fs.exists(caconfigdir+'/ca/'+filename,function(exists){
            if(!exists){
                cafilesmissing=true;
                callback();
            } else{
                callback();
            }
        });
    },function(){
        if(cafilesmissing==false && serverfilesmissing==false){
            //ALL CA and Server files are present.  Server has been initialized.
            mystatus.init=true;
        }
    });
});

//This stores the password to disk
function storepw(pw, callback){
    var key = new Buffer(pw);
    var salt = new Buffer("we need to change this");

//Synchronous
    var scryptpw = scrypt.hashSync(key,{"N":16384,"r":8,"p":1},64,salt);

    fs.writeFile(tmppwpath, scryptpw, function(err){
       if(err){
           callback(err);
           //return;
       } else {
           console.log('Password written to disk unencrypted to: ' + tmppwpath);
           callback();
       }
    });
}

//this removes the password from the disk
function removepw(){
    fs.writeFile(tmppwpath, "123456789012345601982301983019830129381029381029381203980123980123981203981203980789012345678901234567890", function(err){
        if(err){
            console.log('ERROR HASHING OUT FILE');
            return;
        }
        fs.unlinkSync(tmppwpath);
        console.log('removing pw file')
    });
}

// Initilized the CA, Creates CA Files and Server Certs for OVPN
function init(capassword, callback) {
    if (mystatus.status == 'busy') {
        callback(new Error('status: busy'));
    } else { mystatus.status = 'busy'; }

    storepw(capassword, function(err) {
        console.log('storepw called');
        if (err) {
            //console.log(err);
            callback(err);
        }else {

            console.log('sdcsdcsdcsdc');
            var cmd = '/opt/config.sh -i -d kisspi.com --caconfigdir=' + caconfigdir + ' --outputconfigdir=' + openvpnssldir;

            exec(cmd, function (error, stdout, stderr) {
                mystatus.status = 'idle';
                mystatus.init = true;
                console.log(stdout);
                console.log(stderr);
                removepw();
                callback();
            });
        }
    });
}

// Generate and Sign Certificates for new client.
function createClient(name, capassword, callback){

    if (mystatus.init == false) {
        console.log('init false');
        callback(new Error('init: false'));
        return;
    }
    if (mystatus.status == 'busy') {
        console.log('busy');
        callback(new Error('status: busy'));
        return;
    } else { mystatus.status = 'busy'; }

    storepw(capassword, function(err){
        console.log('storepw called');
        if (err) {
            console.log('error storing pw');
            removepw();
            callback(err);
        }else{
           console.log('Creating Client');
            var cmd = 'createClientCert -n ' + name + ' -c ' + caconfigdir;

            exec(cmd, function(err, stdout, code) {
                //console.log(stdout);
                if (err instanceof Error) {
                    //throw err;
                    mystatus.status = 'idle';
                    removepw();
                    callback(new Error('Bad Password'));
                } else {
                    //console.log('Exit Code: ' + process.exit(code));
                    console.log('createClientOVPN: openssl command completed.');
                    mystatus.status = 'idle';
                    genovpnConfig(name, function(){
                        removepw();
                        callback();
                    });
                }
            });
        }
    });
}

//Generate the VPN Configuration for the Client
function genovpnConfig(name, callback){
    var cmd = 'buildOVPNClientConfig -n ' + name + ' --configdir=' + caconfigdir;
    exec(cmd, function(err, stdout, code) {
        if (err instanceof Error) {
            //throw err;
            mystatus.status = 'idle';
            callback(new Error('Error Genreating Config...'));
        } else {
            callback();
        }
    });
}

//Return the status
function status(){
    return mystatus;
}

// Look on the file system and see what clients have already been created
function showClients(callback) {
    function getDirectories(srcpath) {

        return fs.readdirSync(srcpath).filter(function(file) {
            return fs.statSync(path.join(srcpath, file)).isDirectory();
        });
    }

    var dirs=getDirectories(caconfigdir);

    // This code sucks, no time to figure out how to DRY it.  Suggestions/fix's welcome!
    var i = dirs.indexOf("server");
    if(i != -1) {
        dirs.splice(i, 1);
    }
    i = dirs.indexOf("ca");
    if(i != -1) {
        dirs.splice(i, 1);
    }
    i = dirs.indexOf("client");
    if(i != -1) {
        dirs.splice(i, 1);
    }

    callback(dirs);
}

module.exports.init = init;
module.exports.status = status;
module.exports.createClient = createClient;
module.exports.storepw = storepw;
module.exports.removepw = removepw;
module.exports.showClients = showClients;

