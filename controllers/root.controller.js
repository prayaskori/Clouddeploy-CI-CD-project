// controllers/root.controller.js

function getRoot(req, res) {
  res.status(200).send('CloudDeploy API Running');
}

module.exports = { getRoot };
