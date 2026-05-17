const { exec } = require('child_process');
const { setupFlow, NODE_RED_ENDPOINT } = require('./utils.js');

const { Selector } = require("testcafe");

fixture('Virtual Devices Deployment Test')
  .page(NODE_RED_ENDPOINT);

test('Deploy virtual devices', async t => {
  console.log('Starting test: Deploy virtual devices');
  const flowId = await setupFlow(t, 'empty-flow', 'Virtual Devices');

  console.log('Flow deployed with ID:', flowId);

});

