const jwt = require('jsonwebtoken');
const db = require('../db');


const authenticate = async (req, res, next) => {
    try {
      // Get the token from the request header
      const token = req.header('Authorization').replace('Bearer ', '');
 
      if (token == null) {
        // Return 401 Unauthorized if token is not provided
        return res.sendStatus(401);
      }
    
      // Verify the JWT token
      jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
        if (err) {
          // Return 403 Forbidden if token is invalid
          return res.sendStatus(403);
        }
        
      const user = await db.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
  

      if (!user.rows[0]) {
        throw new Error();
      }
  
      // Set the user object on the request object for later use
      req.user = user.rows[0];
  

      next();
    });
  
    } catch (e) {
      res.status(401).send({ error: 'Unauthorized' });
    }
  };
  
  module.exports = authenticate;