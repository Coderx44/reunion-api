const { Pool } = require('pg')

// Replace the values below with your own database credentials
module.exports =  new Pool({
  user: 'reunion_6qcf_user',
  host: 'dpg-cgb0vo02qv267ueii9hg-a',
  database: 'reunion_6qcf',
  password: 'zz9WiePMpDUKxGxo7pA2rWMnpZFGt4mi',
  port: 5432,
})
