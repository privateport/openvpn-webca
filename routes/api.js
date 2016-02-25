var express = require('express');
var router = express.Router();
var cautils = require('../cautils');
var util = require('util');


/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', { title: 'Privateport.io: Certificate Authority API' });
});

// Get the Status
router.get('/status', function(req, res, next) {
    res.json(cautils.status());
});

// Initialize - Create CA certs and Openvpn Server Certs
router.post('/init', function(req, res, next) {
    var capassword = req.body.capassword;
    req.checkBody('capassword', 'capassword parameter invalid').isAlphanumeric();

    var errors = req.validationErrors();
    if (errors) return next(util.inspect(errors));

    console.log('CAPASSWORD: ' + capassword);

    cautils.init(capassword, function(err){
        if (err) {
            console.log ('Error storing pw to disk');
            return next(err);
        }else{

        }
    });
    console.log('init finished');
    res.json({response: 'OK'});
});

// Create Client Certifictate
router.post('/createclient', function(req, res, next) {

    var name = req.body.name;
    var capassword = req.body.capassword;

    req.checkBody('name', 'name parameter invalid').isAlphanumeric();
    req.checkBody('capassword', 'capassword parameter invalid').isAlphanumeric();

    var errors = req.validationErrors();
    if (errors) return next(util.inspect(errors));

    cautils.createClient(name, capassword, function (err) {
        if (err) {
            //Let's just check to see if it ws the password.
            if ( err = "Bad Password") {
                res.status(403).json({result: 'bad password'});
            }else{
                return next(err);
            }
        }else {
            console.log('Function: CreateClient called back');
            res.json({response: 'OK'});
        }
    });


});

//Return the OVPN Configuration for the given file
router.get('/getclientovpnconfig/:name', function(req, res, next) {
    req.checkParams('name', 'name parameter invalid').isAlphanumeric();
    var errors = req.validationErrors();
    if (errors) return next(util.inspect(errors));

    res.download('/persistant/openssl/' + req.params.name + '/client.conf', 'privateport-' + req.params.name + '.ovpn');
});

// Return SSL Clients
router.get('/getclientovpnconfig', function(req, res, next) {
   cautils.showClients( function (data, err) {
        console.log('Clients:' + data);
       res.json(data);
   });
});

module.exports = router;
