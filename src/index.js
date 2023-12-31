const dotenv = require('dotenv')
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const ws = require("ws");
const fs = require("fs");

const User = require("./models/User");
const Message = require("./models/Message");
const port = 4000;

//
const profileRoute = require('./routes/profileRoute');
const peopleRoute = require('./routes/peopleRoute');
const logoutRoute = require('./routes/logoutRoute');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    credentials: true,
    origin: "http://localhost:3000",
  })
);
app.use('/uploads', express.static(__dirname + '/uploads'));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
});

dotenv.config();

const server = app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});


mongoose
  .connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("mongoose connection successful"))
  .catch((err) => console.log("mongoose error", err));
const jwtSecret = process.env.JWT_SECRET;
const bcryptSalt = bcrypt.genSaltSync(10);

app.get("/", (req, res) => {
  res.json("Hello world");
});

async function getUserDataFromRequest(req) {
  return new Promise( (resolve, reject) => {
    const token = req.cookies?.token;
    if (token) {
      jwt.verify(token, jwtSecret, {}, (err, userData) => {
        if (err) throw err;
        resolve(userData);
      });
    } else {
      reject('No Token');
    }
  });
}

app.post("/register", async (req, res) => {
  console.log("called");
  const { username, password } = req.body;
  try {
    const hashedPassword = bcrypt.hashSync(password, bcryptSalt);
    const createdUser = await User.create({
      username: username,
      password: hashedPassword,
    });
    jwt.sign(
      { userId: createdUser._id, username },
      jwtSecret,
      {},
      (err, token) => {
        console.log("the token", token);
        if (err) throw err;
        res
          .cookie("token", token, { sameSite: "none", secure: true })
          .status(201)
          .json({
            id: createdUser._id,
          });
      }
    );
  } catch (err) {
    if (err) throw err;
    res.status(500).json("error");
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const foundUser = await User.findOne({ username });
  if (foundUser) {
    const passOk = bcrypt.compareSync(password, foundUser.password);
    if (passOk) {
      jwt.sign(
        { userId: foundUser._id, username },
        jwtSecret,
        {},
        (err, token) => {
          if (err) throw err;
          res.cookie("token", token, { sameSite: "none", secure: true }).json({
            id: foundUser._id,
          });
        }
      );
    }
  }
});

// app.get("/profile", (req, res) => {
//   const token = req.cookies?.token;
//   if (token) {
//     jwt.verify(token, jwtSecret, {}, (err, userData) => {
//       if (err) throw err;
//       res.json(userData);
//     });
//   } else {
//     res.status(401).json("no token");
//   }
// });


const wss = new ws.WebSocketServer({ server });
wss.on("connection", (connection, req) => {


  function notifyAboutOnlinePeople(){    
  [...wss.clients].forEach((client) => {
    client.send(
      JSON.stringify({
        online: [...wss.clients].map((c) => ({
          userId: c.userId,
          username: c.username,
        })),
      })
    );
  });
  }
  connection.isAlive = true;

  connection.timer = setInterval( () => {
    connection.ping()
    connection.deathTimer = setTimeout( () => {
      connection.isAlive = false;
      clearInterval(connection.timer);
      connection.terminate();
      notifyAboutOnlinePeople();
      // console.log('dead')
    }, 1000)
  }, 5000)

  connection.on('pong', () => {
      clearTimeout(connection.deathTimer)
  })

  //read username and id from the cookie for this connection
  const cookies = req.headers.cookie;
  if (cookies) {
    const tokenCookieString = cookies
      .split(";")
      .find((str) => str.startsWith("token="));
    // console.log("The split token", tokenCookieString);
    if (tokenCookieString) {
      const token = tokenCookieString.split("=")[1];
      // console.log("🚀 ~ file: index.js:105 ~ wss.on ~ token:", token);
      if (token) {
        jwt.verify(token, jwtSecret, {}, (err, userData) => {
          if (err) throw err;
          const { userId, username } = userData;
          connection.userId = userId;
          connection.username = username;
        });
      }
    }
  }

  //grab all the clients from websocket server
  //notify everyone about online people(when someone connects)
  notifyAboutOnlinePeople();

  // console.log(
  //   "no of clients",
  //   [...wss.clients].map((c) => c.username)
  // );


  connection.on("message", async (message) => {
    const messageData = JSON.parse(message.toString());
    // console.log("The message-->", messageData);
    const { recipient, text, file } = messageData;
    let filename = null;
    if(file){
      const parts = file.name.split('.');
      const ext = parts[parts.length - 1];
      filename = Date.now() + '.'+ext;
      const path = __dirname + '/uploads/' + 'echowave_'+filename;
      const bufferData = new Buffer(file.data.split(',')[1],'base64')
      fs.writeFile(path, bufferData, () => {
        console.log('file saved:' +path);
      });
    }
    if (recipient && (text || file)) {
      const messageDoc = await Message.create({
        sender: connection.userId,
        recipient,
        text,
        file: file ? filename : null,
      });
      [...wss.clients]
        .filter((c) => c.userId === recipient)
        .forEach((c) =>
          c.send(
            JSON.stringify({
              //sending message
              text,
              sender: connection.userId,
              recipient,
              file: file ? filename : null,
              _id: messageDoc._id,
            })
          )
        );
    }
  });
});

app.get('/messages/:userId', async (req, res) => {
  const {userId} = req.params;
  const userData = await getUserDataFromRequest(req);
  const ourUserId = userData.userId;
  // console.log('The user ids', {userId, ourUserId})
  const messages =  await Message.find({
    sender:{$in : [userId, ourUserId]} ,
    recipient: {$in : [userId, ourUserId]}
  }).sort({createdAt : 1});
  res.json(messages)
})


///
app.use("/profile", profileRoute);

app.use("/people", peopleRoute);

app.use("/logout", logoutRoute)