const dotenv = require("dotenv");
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const cookieParser = require('cookie-parser')
const bcrypt = require('bcryptjs')

const User = require("./models/User");
const port = 4000;

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    credentials: true,
    origin: "http://localhost:3000",
  })
);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});


dotenv.config();
mongoose.connect(process.env.MONGO_URL)
.then(() => console.log('mongoose connection successful'))
.catch( (err) => console.log('mongoose error', err));
const jwtSecret = process.env.JWT_SECRET;
const bcryptSalt = bcrypt.genSaltSync(10)


app.get("/", (req, res) => {
  res.json("Hello world");
});

app.post("/register", async (req, res) => {
    console.log('called')
  const { username, password } = req.body;
  try {

    const hashedPassword = bcrypt.hashSync(password, bcryptSalt)
    const createdUser = await User.create({ 
      username:username, 
      password:hashedPassword
     });
    jwt.sign({ userId: createdUser._id, username }, jwtSecret, {}, (err, token) => {
      console.log("the token", token);
      if (err) throw err;
      res.cookie('token', token, {sameSite:'none', secure: true}).status(201).json({
        id: createdUser._id,
      });
    });
  } catch (err) {
    if (err) throw err;
    res.status(500).json('error')
  }
});

app.post('/login', async (req, res) => {
  const { username, password} = req.body;
  const foundUser = await User.findOne({ username});
  if(foundUser){
    const passOk = bcrypt.compareSync(password, foundUser.password);
    if(passOk){
      jwt.sign({ userId: foundUser._id, username }, jwtSecret, {}, (err, token) => {
        if (err) throw err;
        res.cookie('token', token, {sameSite:'none', secure: true}).json({
          id: foundUser._id,
        });
      });
    }
  }
})

app.get('/profile', (req, res) => {
  const token = req.cookies?.token;
  if(token){
    jwt.verify(token, jwtSecret, {}, (err, userData) => {
      if(err) throw err;
      res.json(userData);
    })
  }else {
    res.status(401).json('no token')
  }
})

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
