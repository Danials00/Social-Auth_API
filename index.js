// server.js

const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();
const port = 3000;

require('dotenv').config()

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/social-login', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// User model
const userSchema = new mongoose.Schema({
  googleId: String,
  displayName: String,
});
const User = mongoose.model('User', userSchema);

// Passport configuration
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    (accessToken, refreshToken, profile, done) => {
      User.findOne({ googleId: profile.id }, (err, user) => {
        if (err) return done(err);
        if (!user) {
          const newUser = new User({
            googleId: profile.id,
            displayName: profile.displayName,
          });
          newUser.save((err) => {
            if (err) return done(err);
            return done(null, newUser);
          });
        } else {
          return done(null, user);
        }
      });
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) => {
    done(err, user);
  });
});

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// Routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile'] }));

app.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    const token = jwt.sign({ user: req.user }, 'YOUR_SECRET_KEY');
    res.cookie('jwt', token, { httpOnly: true });
    res.redirect('http://localhost:5000');
  }
);

app.get('/logout', (req, res) => {
  res.clearCookie('jwt');
  res.redirect('http://localhost:5000');
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
