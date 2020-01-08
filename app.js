//jshint esversion:6
require("dotenv").config();
const express = require("express"),
      ejs = require("ejs"),
      bodyParser = require("body-parser"),
      mongoose = require("mongoose"),
      session = require("express-session"),
      passport = require("passport"),
      passportLocalMongoose = require("passport-local-mongoose");
      GoogleStrategy = require("passport-google-oauth20").Strategy;
      findOrCreate = require("mongoose-findorcreate");
      FacebookStrategy = require("passport-facebook").Strategy;

const port = 3000,
      app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static('public'));
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb://" + process.env.DB_HOST + ":" + process.env.DB_PORT + "/" + process.env.DB_NAME, {
  useNewUrlParser: true,
  useFindAndModify: false,
  useUnifiedTopology: true,
  useCreateIndex: true
});

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  googleId: String,
  facebookId: String,
  secret: String
});
userSchema.plugin(passportLocalMongoose, {errorMessages: true});
userSchema.plugin(findOrCreate);
const User = new mongoose.model('User', userSchema);

passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  }, (accessToken, refreshToken, profile, cb) => {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets",
    enableProof: true
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id}, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", (req, res) => {
  res.render('home');
});

app.get("/auth/google",
  passport.authenticate("google", {scope: [ "profile" ]}));

app.get("/auth/google/secrets",
  passport.authenticate("google", {failureRedirect: "/login"}), (req, res) => {
    res.redirect("/secrets");
  });

app.get('/auth/facebook',
    passport.authenticate('facebook'));

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/secrets');
  });

app.route("/login")
  .get((req, res) => {
    res.render('login');
  })
  .post((req, res) => {
    const user = new User({
      username: req.body.username,
      password: req.body.password
    });
    req.login(user, (err) => {
      if(!err){
        passport.authenticate("local")(req, res, () => {
          res.redirect("/secrets");
        });
      }else{
        console.log(err);
        res.redirect("/login");
      }
    });
  });

app.route("/register")
  .get((req, res) => {
    res.render('register');
  })
  .post((req, res) => {
    User.register({username: req.body.username}, req.body.password, (err, registeredUser) => {
      if(!err){
        passport.authenticate("local")(req, res, () => {
          res.redirect("/secrets");
        });
      }else{
        console.log(err);
        res.redirect("/register");
      }
    }
  );


  });

app.get("/secrets", (req, res) => {
  if(req.isAuthenticated()){
    User.findById(req.user.id, (err, foundUser) => {
      if(!err){
        res.render('secrets', {secretText: foundUser.secret});
      }else{
        console.log(err);
        res.redirect("/logout");
      }
    });

  }else{
    res.redirect("/login");
  }
});

app.get("/submit", (req, res) => {
  if(req.isAuthenticated()){
    res.render("submit");
  }else{
    res.redirect("/login");
  }
});

app.post("/submit", (req, res) => {
  User.findById(req.user.id, (err, foundUser) => {
    if(!err){
      if(foundUser){
        foundUser.secret = req.body.secret;
        foundUser.save((err) => {
          if(!err){
             console.log("Secret added successfully...");
             res.redirect("/secrets");
        }else{
          console.log(err);
          res.redirect("/submit");
        }
        });
      }else{
        console.log("No such user found...");
        res.redirect("/submit");
      }
    }else{
      console.log(err);
      res.redirect("/submit");
    }

  });
});

app.get("/logout",(req, res) => {
  req.logout();
  res.redirect("/");
});


app.listen(port, (err) => {
  if (!err) {
    console.log("Server is listening on port " + port);
  } else {
    console.log(err);
  }
});
