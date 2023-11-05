const User = require("../models/User");

async function getPeople(req, res) {
    try {
      const users = await User.find({}, { '_id': 1, username: 1 });
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
  
module.exports = {
    getPeople,
};