const bcrypt = require('bcrypt');

async function generateHashes() {
  const admin = await bcrypt.hash('123456', 10);
  const ramesh = await bcrypt.hash('ramesh1234', 10);
  const suresh = await bcrypt.hash('suresh1234', 10);

  console.log('Admin hash:', admin);
  console.log('Ramesh hash:', ramesh);
  console.log('Suresh hash:', suresh);
}

generateHashes();