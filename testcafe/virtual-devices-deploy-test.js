const { exec } = require('child_process');
const { setupFlow, NODE_RED_ENDPOINT, addNodeToCurrentFlow, resetFlowNodeOffset, confirmNodeDialog, deploy } = require('./utils.js');

const { Selector } = require("testcafe");

fixture('Virtual Devices Deployment Test')
  .page(NODE_RED_ENDPOINT);

async function configureVirtualDeviceNode(t, nodeId, device, properties) {
  const nodeSelector = Selector('g').withAttribute('id', nodeId);
  await t.doubleClick(nodeSelector);

  // select the device type
  console.log()
  const typeSelector = Selector('#node-input-device');
  await t.click(typeSelector);
  await t.click(Selector('#node-input-device option').withText(device));

  for (const [name, spec] of Object.entries(properties)) {
    const inputSelector = Selector(`#node-input-${name}`);
    console.log(`Configuring property: ${name} with spec:`, spec);
    if (typeof spec === 'string') {
      // default to text input
      await t.selectText(inputSelector).pressKey('delete');
      await t.typeText(inputSelector, spec);
    } else {
      var { type, value } = spec;

      if (type === 'checkbox') {
        if (value) {
          await t.click(Selector(`#node-input-${name} + label`));
        }
      } else if (type === 'text') {
        // clear existing text
        await t.selectText(inputSelector).pressKey('delete');
        await t.typeText(inputSelector, value);
      } else if (type === 'select') {
        await t.click(inputSelector);
        await t.click(Selector(`#node-input-${name} option`).withText(value));
      } else {
        throw new Error(`Unsupported option type: ${type}`);
      }
    }
  }
}

test('Deploy virtual devices', async t => {
  console.log('Starting test: Deploy virtual devices');
  const flowId = await setupFlow(t, 'empty-flow', 'Virtual Devices');

  console.log('Flow deployed with ID:', flowId);

  await t.navigateTo(`${NODE_RED_ENDPOINT}/#flow/${flowId}`);

  // reload the page, to ensure there is no 'review the changed' dialog
  await t.eval(() => location.reload(true));

  // wait for the tab to be active
  await t.expect(Selector('.red-ui-tab.active').withAttribute('id', `red-ui-tab-${flowId}`).exists).ok('Flow tab did not become active');

  resetFlowNodeOffset();

  const nodesToTest = [
    {
      name: 'acload1',
      device: 'AC Load',
      properties: {
        acload_nrofphases: {
          type: 'select',
          value: 'Split phase',
        },
        enable_s2support: {
          type: 'checkbox',
          value: true
        }
      }
    },
    {
      name: 'battery1',
      device: 'Battery',
      properties: {
        'battery_capacity': '50',

      }
    }

  ]

  for (const { name, device, properties } of nodesToTest) {
    console.log(`Adding node: ${name} of type ${device}`);
    const nodeId = await addNodeToCurrentFlow(t, 'victron-virtual')
    console.log(`Node added with ID: ${nodeId}`);

    // open the node's edit dialog
    await configureVirtualDeviceNode(t, nodeId, device, properties);

    await confirmNodeDialog(t);
  }

  // and deploy
  await deploy(t);

});

