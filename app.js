//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const ejs = require("ejs");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const _ = require("lodash");

const app = express();


app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
  secret:"Our little secret.",
  resave:false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session()); //set up passport to use session



mongoose.connect("mongodb://localhost:27017/DejaVu",{ useNewUrlParser: true , useUnifiedTopology: true,useFindAndModify:false});
mongoose.set("useCreateIndex",true);



const wordSchema = new mongoose.Schema({
  number:String,
  name:String,
  class:String,
  definition: String,
  example: String
});

const collectionSchema = new mongoose.Schema({
  collectionName:String
  //words:
});

const userSchema =new mongoose.Schema({ //full mongoose schema
  username:{type:String,unique:true},
  password:String,
  provider:String,
  email: String
})

userSchema.plugin(passportLocalMongoose,{usernameField:"username"});
userSchema.plugin(findOrCreate);


const Word = new mongoose.model("Word",wordSchema);
const User = new mongoose.model("User",userSchema);
const Collection = new mongoose.model("Collection",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "/auth/google/Homepage",

  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate(
      { username: profile.id },
      {
        provider:"google",
        email:profile._json.email
      },
      function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/auth/google",passport.authenticate('google',{
  scope:["profile","email"]
}));


app.get('/auth/google/Homepage',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/Homepage');
  });


app.get("/login",function(req,res){
  res.render("login");
});

//user login
app.post("/login",function(req,res){
  const user = new User({
    email: req.body.username,
    password: req.body.password
  });

  req.login(user,function(err){
    if(err){
      console.log(err);
    }else{
      passport.authenticate("local")(req,res,function(){
        res.redirect("/Homepage"); //need amendment
      });
    }
  });

});

app.get("/",function(req,res){
  res.render("Initial");
});

app.get("/register",function(req,res){
  res.render("Register");
});

app.get("/Homepage",function(req,res){
  if(req.isAuthenticated()){
    res.render("Homepage");
  }else{
    res.redirect("/login");
  }
});

app.get("/logout",function(req,res){
  req.logout();
  res.redirect("/");
});

// Register new user and encrypted
app.post("/register",function(req,res){
    User.register({username:req.body.username, email:req.body.username,provider:"local"},req.body.password,function(err,user){ //passportLocalMongoose
      // directly get into Database
      if(err){
        console.log(err);
        res.redirect("/register");
      }else{
        passport.authenticate("local")(req,res,function(){
          res.redirect("/Homepage"); //need amendment
        })
      }
    });
  }
);




app.get("/allthevocab",function(req,res){
  Word.find({},function(err,foundWords){
    res.render("allthevocab",{allWords:foundWords});
  });
});

app.post("/allthevocab",function(req,res){
  const wordName = req.body.newWord;
  const className = req.body.newclass;
  const definitionName = req.body.newDefinition;
  const exampleName = req.body.newExample;


  const word = new Word({
    number:'1',
    name:wordName,
    class:className,
    definition: definitionName,
    example: exampleName
  });

  word.save();

  res.redirect("/allthevocab");

});

// app.get("/:collectionName",function(req,res){
//     const collectionName=_.capitalize(req.params.collectionName);
//
//     Collection.findOne({collection:collectionName},function(err,foundCollection){
//       if(!err){
//         if(!foundList){
//             const collection = new Collection({
//               collection:collectionName,
//               words:defaultList
//             });
//             list.save();
//             res.redirect("/"+collectionName);
//         }else{
//           res.render("eachCollectionWords",{collection: foundCollection.collection, words: foundCollection.words});
//         }
//       }
//     });
// });


app.listen(3000, function() {
  console.log("Server started on port 3000");
});
