//jshint esversion:6
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose  = require("mongoose");
const encrypt = require("mongoose-encryption");

const port = 3000;
const app = express();

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.set('view engine', 'ejs');

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useFindAndModify: false, useUnifiedTopology: true});

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "Email field can't be empty..."]
  },
  password: {
    type: String,
    required: [true, "Password field can't be empty..."]
  }
});
const secret = "heyiwanttocreateasecretstring";
userSchema.plugin(encrypt, {secret: secret, encryptedFields: ['password']});
const User = new mongoose.model('User', userSchema);

app.get("/", (req, res) => {
  res.render('home');
});

app.route("/login")
  .get((req, res) => {
    res.render('login');
  })
  .post((req, res) => {
    User.findOne({email: req.body.username}, (err, foundUser) => {
      if(!err && foundUser && foundUser.password === req.body.password){
        console.log("Successfull login...");
        res.render('secrets');
      }else{
        console.log(err);
        res.redirect("/login");
      }
    })
  })

app.route("/register")
  .get((req, res) => {
    res.render('register');
  })
  .post((req, res) => {
    const user = new User({
      email: req.body.username,
      password: req.body.password
    });
    user.save((err) => {
      if(!err){
        console.log("New user created successfully...");
        res.render('secrets');
      }else{
        console.log("Error while creating a new user...");
        res.redirect("/register");
      }
    })
  })









app.listen(port, (err) => {
  if(!err){
    console.log("Server is listening on port "+port);
  }else{
    console.log(err);
  }
});