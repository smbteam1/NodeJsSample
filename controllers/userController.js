let express = require('express');
    app = express();
    jwt = require('jsonwebtoken');
    user = require('.././models/userModel');
    functions = require('../helpers/functions');
    Password = require("node-php-password");
    config = require('.././server/config');
    const assert = require('assert');
    var request = require('request');
    moment = require('moment');
    var fs = require('fs');
    var parseString = require('xml2js').parseString;


let handler = {

    index(req, res, next) {
        next();
    },

    //used for login 
    login(req, res, next) {
        if (!req.body.email) {
            req.response.message = "Email is required.";
            next();
        } else if (!req.body.password) {
            req.response.message = "Password is required.";
            next();
        } else {
            user.getUserByEmail(req.body.email).then((result) => {
                if (result.length) {
                    if(Password.verify( req.body.password , result[0].password)){
                        var newtoken = jwt.sign({ "email": result[0].email, "user_id": result[0].user_id }, config.jwt_secret, {
                            expiresIn: "24h"
                        });
                        var newrefreshtoken = jwt.sign({ "email": result[0].email, "user_id": result[0].user_id }, config.jwt_secret, {
                            expiresIn: "48h"
                        });
                        res.setHeader('AuthToken', newtoken)
                        res.setHeader('RefreshToken', newrefreshtoken)
                        req.response.data = result[0];
                        req.response.status = true;
                        req.response.message = "Logged In Successfully.";
                        next();
                     }else{
                        req.response.message = "Incorrect password.";
                        next();
                     }
                    
                } else {
                    req.response.message = "Incorrect login credentials. Please retry.";
                    next();
                }
            }).catch((err) => {
                req.response.message = err + "Oops! something went wrong.";
                next();
            })
        }

    },

    //used to send mail for forgot password 
    forgotPassword(req, res, next) {

        if (!req.body.email) {
            req.response.message = "Email is required.";
            next();
        } else {
            user.getUserByEmail(req.body.email).then((result) => {
                if (result.length) {
                    var reset_code = Math.floor(1000 + Math.random() * 9000);
                    functions.update('user_master', { otp: reset_code }, { email: req.body.email })
                        .then((resu) => {
                            functions.get('general_emails', { "name": "forgot_password" })
                            .then((templateCode) => {
                                if (templateCode) {
                                    var template = templateCode[0];
                                    template.email_template = template.email_template.replace("##CODE##", result[0].otp);
                                    template.email_template = template.email_template.replace("##NAME##", result[0].first_name);
                                    functions.sendMail(result[0].email, "Verification Code", template, true, function (emailres) {
                                    })
                                }
                            });
                            req.response.status = true;
                            req.response.otp = reset_code;
                            req.response.message = "We have sent a verification code to the email.";
                            next();
                        }).catch((err) => {
                            req.response.message = "Oops! something went wrong.";
                            next();
                        })
                } else {
                    req.response.message = "Email does not exist.";
                    next();
                }
            }).catch((err) => {
                req.response.message = "Oops! something went wrong.";
                next();
            })
        }
    },
    //used to verify otp 
    verifyResetCode(req, res, next) {
        if (req.body.email != '') {
            user.getUserByEmail(req.body.email)
                .then((details) => {
                    if (details[0].otp == req.body.otp) {
                        req.response.message = "Email verified successfully.";
                        req.response.status = true;
                        next();
                    } else {
                        req.response.message = "Invalid verification code.";
                        next();
                    }
                }).catch((err) => {
                    req.response.message = "Oops! something went wrong.";
                    next();
                })
        } else {
            next();
        }
    },
//used to set password 
    setPassword(req, res, next) {
        if (req.body.email) {
            if (!req.body.password) {
                req.response.message = "Password is required.";
                next();
            } else {
                user.getUserByEmail(req.body.email)
                .then((result) => {
                    if (result.length) {
                        if (result[0].otp == req.body.otp) {
                            var enc_pass = Password.hash(req.body.password, "PASSWORD_DEFAULT");
                            functions.update('user_master', { password: enc_pass }, { email: req.body.email })
                            .then((result) => {
                                req.response.status = true;
                                req.response.message = "Password reset successfully.";
                                next();
                            }).catch((err) => {
                                req.response.err = err;
                                req.response.message = "Oops! something went wrong.";
                                next();
                            })
                        }else{
                            req.response.message = "Invalid verification code.";
                            next();
                        }
                       
                    } else {
                        req.response.message = "User Does Not exist.";
                        next();
                    }
                }).catch((err) => {
                        req.response.message = "Oops! something went wrong.";
                        next();
                })
            }

        } else {
            req.response.message = "Oops! something went wrong.";
            next();
        }
    },
    
//get location lists
    getLocations(req, res, next) {
        user.getLocations( req.body.latitude, req.body.longitude )
        .then((result) => {
            const getData = async (result) => {
                let retArray = [];
                for (const num of result) {
                    retArray.push(await returnData(num));
                }
                return retArray;
            }
            const returnData = details => {
                let insArray = { type: "Feature", properties : {}, geometry : {  type :"Point", coordinates : [] }};
                return new Promise((resolve, reject) => {
                    insArray.properties = details;
                    insArray.geometry.coordinates.push(parseFloat(details.longitude),parseFloat(details.latitude))
                    resolve(insArray);
                });
            }
            getData(result).then((result) => {
                req.response.status = true;
                req.response.data = resdata;
                req.response.resdata = resdata;
                req.response.message = "Success";
                next();
            })
           
        }).catch((err) => {
            req.response.err = err;
            req.response.message = "Oops! something went wrong.";
            next();
        })
        
    },
//get location details
    getLocationDetails(req, res, next){
        if (!req.body.residential_id) {
            req.response.message = "Location is required.";
            next();
        } else {
            user.getLocationDetails(req.body.residential_id)
            .then((result) => {
                req.response.data = {};
                req.response.status = true;
                req.response.data.details = result[0];
                req.response.message = "Success";
                next();
            }).catch((err) => {
                req.response.message = "Oops! something went wrong.";
                next();
            })
        }
       
    },
    //get user visited history for particular locations
    getLocationHistory(req, res, next){
        if (!req.body.residential_id) {
            req.response.message = "Location is required.";
            next();
        } else {
            user.getLocationHistory(req.body.residential_id)
            .then((result) => {
                req.response.status = true;
                req.response.data.history = result;
                req.response.message = "Success";
                next();
            }).catch((err) => {
                req.response.message = "Oops! something went wrong.";
                next();
            })
        }
       
    },
    //get user idetails

    getUserInfo(req, res, next){
        
        if (req.decoded.user_id) {
            user.getUserInfo(req.decoded.user_id)
            .then((result) => {
                if(result[0].area_coordinates != '' && result[0].area_coordinates != null ){
                    result[0].area_coordinates = JSON.parse(result[0].area_coordinates)[0];
                    req.response.status = true;
                    req.response.data = result[0];
                    req.response.message = "Success";
                    next();
                }else{
                    result[0].area_coordinates = [];
                    req.response.status = true;
                    req.response.data = result[0];
                    req.response.message = "Success";
                    next();
                }
            }).catch((err) => {
                req.response.message = "Oops! something went wrong.";
                next();
            })
        } else {
            req.response.message = "Oops! something went wrong.";
            next();
        }
    },

    //get sales rep details

    getSalesRepDetails(req, res, next){
        if (req.decoded.user_id) {
            user.getUserInfo(req.body.user_id)
            .then((result) => {
                if(result[0].area_coordinates != '' && result[0].area_coordinates != null ){
                    result[0].area_coordinates = JSON.parse(result[0].area_coordinates)[0];
                }else{
                    result[0].area_coordinates = [];
                }
                req.response.status = true;
                req.response.data = result[0];
                req.response.message = "Success";
                next();
            }).catch((err) => {
                req.response.message = "Oops! something went wrong.";
                next();
            })
        } else {
            req.response.message = "Oops! something went wrong.";
            next();
        }
    },
    
    //get nearest locations
    getNearestLocations(req, res, next){
        // Use connect method to connect to the server
        MongoClient.connect(mongourl,{ useNewUrlParser: true }, function(err, client) {
            assert.equal(null, err);
            const db = client.db(dbName);
            const collection = db.collection('residential_data_master');
            collection.createIndex({ geometry: "2dsphere" });
            collection.find(
                {
                    geometry:
                    { $near:
                       {
                         $geometry: { type: "Point",  coordinates: [ req.body.longitude, req.body.latitude ] },
                         $minDistance: 1000,
                         $maxDistance: 5000
                       }
                    }
                }
             ).toArray(function(err, docs) {
                req.response.data = {};
                req.response.status = true;
                req.response.data.type = 'FeatureCollection';
                req.response.data.features = docs;
                req.response.message = "Success";
                next();
            })
        });
    },

    



}

module.exports = handler;