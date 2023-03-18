const express = require('express')
const db = require('./db');
const app = express();
const port = 3000;
const usersRouter = require('./routes/user');
const middleware = require('./middleware/auth')
// middleware to parse request body as JSON
// app.use(middleware)
app.use(express.json());

// routes for user-related endpoints
app.use('/api/', usersRouter);

const seed = require('./seed')
// seed();
app.get('/', (req, res) => {
    res.send("welcome");
});



app.listen(port, async () => {
    console.log(`Server running on port ${port}`)
  })

module.exports = app;