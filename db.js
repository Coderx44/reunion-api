const { Pool } = require('pg')

// Replace the values below with your own database credentials
module.exports =  new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'reunion',
  password: 'dbqwer',
  port: 5432,
})

