var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
config = require('.././server/config');
usercontroller = require('../controllers/userController');

/* GET users listing. */
router.get('/', function (req, res, next) {
  res.send('Prospect');
});

router.use(function (req, res, next) {
  req.response = { status: false, message: "error" };
  next();
});

/* Function used for login. */
router.post('/login', usercontroller.login, (req, res, next) => {
  res.json(req.response)
});

/* Function used for forgot password. this will send otp to the users email. */
router.post('/forgotPassword', usercontroller.forgotPassword, (req, res, next) => {
  res.json(req.response)
});

/* Function used to verify otp. */
router.post('/verifyResetCode', usercontroller.verifyResetCode, (req, res, next) => {
  res.json(req.response)
});
/* Function used to set password. */
router.post('/setPassword', usercontroller.setPassword, (req, res, next) => {
  res.json(req.response)
});

/* Function used to authenticate the token. */
router.use(function (req, res, next) {
  var token = req.headers['authtoken'];
  var refreshtoken = req.headers['refreshtoken'];
  if (refreshtoken) {
    jwt.verify(refreshtoken, config.jwt_secret, function (err, decoded) {
      if (err) {
        res.setHeader('Authentication', false)
        return res.json({ status: false, Authentication: false, message: "Failed to authenticate token.", invalidToken: true });
      } else {
        res.setHeader('Authentication', true)
        req.decoded = decoded;
        var newtoken = jwt.sign({ "email": req.decoded.email, "user_id": req.decoded.user_id }, config.jwt_secret, {
          expiresIn: "24h"
        });
        var newrefreshtoken = jwt.sign({ "email": req.decoded.email, "user_id": req.decoded.user_id }, config.jwt_secret, {
          expiresIn: "48h"
        });
        res.setHeader('AuthToken', newtoken)
        res.setHeader('RefreshToken', newrefreshtoken)
        next();
      }
    });
  } else {
    if (token) {
      jwt.verify(token, config.jwt_secret, function (err, decoded) {
        if (err) {
          res.setHeader('Authentication', false)
          return res.json({ status: false, Authentication: false, message: "Failed to authenticate token.", invalidToken: true });
        } else {
          res.setHeader('Authentication', true)
          req.decoded = decoded;
          next();
        }
      });
    } else {
      res.setHeader('Authentication', false)
      return res.json({
        status: false,
        message: "Failed to authenticate token.",
      })
    }
  }
});

/* Function used to get the user details. */
router.get('/getUserInfo', usercontroller.getUserInfo, (req, res, next) => {
  res.json(req.response)
});

/* Function used to get location details */
router.post('/getLocationDetails', usercontroller.getLocationDetails, usercontroller.getLocationHistory, (req, res, next) => {
  res.json(req.response)
});

/* Function used to get location lists */
router.post('/getLocations', usercontroller.getLocations, (req, res, next) => {
  res.json(req.response)
});

/* Function used to add locations */
router.post('/addLocations', usercontroller.addLocations, (req, res, next) => {
  res.json(req.response)
});

/* Function used to add address details */
router.post('/addAddress', usercontroller.addAddress, (req, res, next) => {
  res.json(req.response)
});

/* Function used to create ccustomer */
router.post('/createCustomer', usercontroller.createCustomer, (req, res, next) => {
  res.json(req.response)
});

module.exports = router;
