const jwt = require("jsonwebtoken");
const jwtSecret = process.env.JWT_SECRET;


const profileController = (req, res) => {
    res.json("profile works");
    const token = req.cookies?.token;
    if (token) {
      jwt.verify(token, jwtSecret, {}, (err, userData) => {
        if (err) throw err;
        res.json(userData);
      });
    } else {
      res.status(401).json("no token");
    }
}

module.exports = profileController;