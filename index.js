const dotenv = require('dotenv')
const express = require('express');
const app = express();
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')


const User = require('./models/User');



const port = 4000;


dotenv.config();
mongoose.connect(process.env.MONGO_URL)
const jwtSecret = process.env.JWT_SECRET;


app.get('/', (req,res) => {
    res.json("Hello world")
})


app.post('/register', async (req, res) => {
    const { username, password} = req.body;
   const createdUser = await  User.create({username, password});
   
   jwt.sign({userId: createdUser, _id}, jwtSecret, (err, token) => {
    console.log('the token', token);

    if(err) throw err;
    res.cookie('token', token).status(201).json('OK')
   })
})

app.listen(port, () => {
    console.log(`Server listening on port ${port}`)
})