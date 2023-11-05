async function logoutController(req, res) {
    res.cookie('token', '', {sameSite: 'none', secure: true} ).json('Ok')
}


module.exports = logoutController;
// module.exports = {
//     logout,
//   };