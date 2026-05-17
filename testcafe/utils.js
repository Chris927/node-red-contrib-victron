const { exec } = require('child_process');
const { readFileSync } = require('fs');

const { Selector } = require("testcafe");

export const NODE_RED_ENDPOINT = process.env.NODE_RED_ENDPOINT || 'http://localhost:1880';

export const SSH_COMMAND = process.env.SSH_COMMAND || 'ssh -p 2232 root@localhost';

export async function setupFlow(t, flowName, nameOverride) {
  console.log(`Setting up flow: ${flowName}`);
  // Add any setup steps needed for different flows here
  const flowAsText = readFileSync(`./testcafe/setup/${flowName}.json`, 'utf8');
  console.log(`Flow content, first lines: ${flowAsText.split('\n').slice(0, 7).join('\n')}`);
  const flow = JSON.parse(flowAsText);
  if (nameOverride) {
    flow.label = nameOverride;
  }

  // delete the flow, if it exists
  const existingFlows = await t.request.get(`${NODE_RED_ENDPOINT}/flows`, {
    headers: {
      'Node-RED-API-Version': 'v2'
    }
  }).then(async res => {
    await t.expect(res.status).eql(200);
    console.log(`Existing flows response: ${res.status} - ${res.statusText}`, Object.keys(res.body));
    return res.body.flows;
  });
  console.log(`Existing flows, labels: ${existingFlows.map(f => `${f.id} - ${f.label}`).join(', ')}`);
  for (const existingFlow of existingFlows) {
    console.log(`Existing flow: ${existingFlow.id} - ${existingFlow.label}`);
    // TODO: we may accidentally have two flows with the same label
    if (existingFlow.label === flow.label) {
      console.log(`Deleting existing flow: ${existingFlow.id} - ${existingFlow.label}`);
      const deleteResult = await t.request.delete(`${NODE_RED_ENDPOINT}/flow/${existingFlow.id}`);
      console.log(`Flow delete response: ${deleteResult.status} - ${deleteResult.statusText}`, deleteResult.body);
      await t.expect(deleteResult.status).eql(204);
    }
  }
  const result = await t.request.post(`${NODE_RED_ENDPOINT}/flow`, {
    headers: { 'Content-Type': 'application/json' },
    body: flow
  });
  console.log(`Flow setup response: ${result.status} - ${result.statusText}`, result.body);
  await t.expect(result.status).eql(200);
  return result.body.id;
}

export async function dbus_SetValue(name, path, value) {
  const command = `${SSH_COMMAND} "dbus-send --system --type=method_call --print-reply --dest='${name}' '${path}' com.victronenergy.BusItem.SetValue '${value}'"`;
  console.log(`Executing command: ${command}`);
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing command: ${error.message}`);
        return reject(error);
      }
      if (stderr) {
        console.error(`Command stderr: ${stderr}`);
      }
      console.log(`Command stdout: ${stdout}`);
      resolve(stdout);
    });
  });
}

export async function dbus_GetValue(name, path) {
  const command = `${SSH_COMMAND} "dbus-send --system --type=method_call --print-reply --dest='${name}' '${path}' com.victronenergy.BusItem.GetValue"`;
  // console.log(`Executing command: ${command}`);
  // retry max 3 times
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
          if (error) {
            console.error(`Error executing command: ${error.message}`);
            return reject(error);
          }
          if (stderr) {
            console.error(`Command stderr: ${stderr}`);
          }
          console.log(`Command stdout: ${stdout}`);
          resolve(stdout);
        });
      });
      return result;
    } catch (error) {
      console.error(`Attempt ${attempt} failed: ${error.message}`);
      if (attempt === 3) {
        throw error;
      }
      // wait 1 second before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

export async function getExistingNodeIds() {
  const existingNodes = Selector('#red-ui-workspace-chart .red-ui-flow-node.red-ui-flow-node-group');
  // iterate all that match
  const count = await existingNodes.count;
  console.log(`Found ${count} existing nodes on workspace`);
  return Promise.all(Array.from({ length: count }, (_, i) => existingNodes.nth(i).getAttribute('id')));
}

export async function confirmNodeDialog(t) {
  await t.click('#node-dialog-ok');
}

export async function deploy(t) {

  await t.click('#red-ui-header-button-deploy');

  const notification = Selector('#red-ui-notifications div p').innerText;
  await t.expect(notification).eql('Successfully deployed');

}

let nextNodeOffsetY = 200;

export function resetFlowNodeOffset() {
  nextNodeOffsetY = 200;
}

export async function addNodeToCurrentFlow(t, nodePaletteType) {

  /** Adds a node of the given palette type to the current flow by dragging it from the palette.
   * Returns the id of the newly added node.
   *
   * TODO: similar to addVirtualSwitchNode() in ./switches-config-test.js, should be refactored.
   */

  const existingNodeIds = await getExistingNodeIds();
  console.log(`Existing node ids on workspace before adding virtual switch: ${existingNodeIds.join(', ')}`);

  const paletteItem = Selector(`.red-ui-palette-node[data-palette-type="${nodePaletteType}"]`).find('.red-ui-palette-label');
  await t.dragToElement(paletteItem, Selector('#red-ui-workspace-chart'), {
    destinationOffsetX: 400,
    destinationOffsetY: nextNodeOffsetY
  });

  nextNodeOffsetY += 30;

  const nodeIdsAfter = await getExistingNodeIds();
  console.log(`Existing node ids on workspace after adding virtual switch: ${nodeIdsAfter.join(', ')}`);
  const newNodeIds = nodeIdsAfter.filter(id => !existingNodeIds.includes(id));
  if (newNodeIds.length !== 1) {
    throw new Error(`Expected exactly one new node to be added, but found ${newNodeIds.length}. Existing nodes: ${existingNodeIds.join(', ')}, nodes after: ${nodeIdsAfter.join(', ')}`);
  }
  return newNodeIds[0];
}
