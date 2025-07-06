const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://towy_db_owner:iDMY39zGtgOr@ep-spring-unit-a58d260q.us-east-2.aws.neon.tech/towy_db?sslmode=require'
});

client.connect()
  .then(() => {
    console.log('Connected successfully!');
    return client.end();
  })
  .catch(err => {
    console.error('Connection error:', err.stack);
  });