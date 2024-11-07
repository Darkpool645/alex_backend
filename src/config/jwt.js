const jwt = require("jsonwebtoken");
require("dotenv").config();

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      schoolId: user.schoolId 
    },
    process.env.JWT_SECRET,
    { expiresIn: user.time || "1h" }
  );
};

const verifyToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { generateToken, verifyToken };
