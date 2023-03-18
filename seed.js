const db = require('./db')


// define some dummy users
const users = [
    { name: 'John Doe', email: 'johndoe@example.com', password: 'password1' },
    { name: 'Jane Doe', email: 'janedoe@example.com', password: 'password2' },
    { name: 'Bob Smith', email: 'bobsmith@example.com', password: 'password3' },
  ];
  
  // define the seed function
  async function seed() {
    try {
      // create a new client from the pool
      const client = await db.connect();
  
      // insert each user into the database
      for (const user of users) {
        await client.query(`
          INSERT INTO users (name, email, password)
          VALUES ($1, $2, $3)
        `, [user.name, user.email, user.password]);
      }
  
      // release the client back to the pool
      client.release();
  
      console.log('Seed complete!');
    } catch (err) {
      console.error(err);
    }
  }
  
  // call the seed function
  module.exports = seed;