const https = require('https');

const data = JSON.stringify({
  amount: 1,
  businessUnitId: 'BU_mdiaars4_e4dawr8lvqq'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/wallet/create-payment-link',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('Testing payment link creation...');
