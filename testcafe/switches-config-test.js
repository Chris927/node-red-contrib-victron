const { readFileSync } = require('fs');
const { exec } = require('child_process');

const { Selector } = require("testcafe");

const NODE_RED_ENDPOINT = process.env.NODE_RED_ENDPOINT || 'http://localhost:1880';

const SSH_COMMAND = process.env.SSH_COMMAND || 'ssh -p 2232 root@localhost';

fixture('Getting Started 2')
	.page(NODE_RED_ENDPOINT);

console.log('Running tests with custom configuration');

async function setupFlow(t, flowName) {
	console.log(`Setting up flow: ${flowName}`);
	// Add any setup steps needed for different flows here
	const flowAsText = readFileSync(`./testcafe/setup/${flowName}.json`, 'utf8');
	console.log(`Flow content, first lines: ${flowAsText.split('\n').slice(0, 7).join('\n')}`);
	const flow = JSON.parse(flowAsText);

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

async function dbus_SetValue(name, path, value) {
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

async function dbus_GetValue(name, path) {
	const command = `${SSH_COMMAND} "dbus-send --system --type=method_call --print-reply --dest='${name}' '${path}' com.victronenergy.BusItem.GetValue"`;
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

async function getExistingNodeIds() {
	const existingNodes = Selector('#red-ui-workspace-chart .red-ui-flow-node.red-ui-flow-node-group');
	// iterate all that match
	const count = await existingNodes.count;
	console.log(`Found ${count} existing nodes on workspace`);
	return Promise.all(Array.from({ length: count }, (_, i) => existingNodes.nth(i).getAttribute('id')));
}

let nextNodeOffsetY = 200;

async function addVirtualSwitchNode(t) {

	const existingNodeIds = await getExistingNodeIds();
	console.log(`Existing node ids on workspace before adding virtual switch: ${existingNodeIds.join(', ')}`);

	const paletteItem = Selector('.red-ui-palette-node[data-palette-type="victron-virtual-switch"]').find('.red-ui-palette-label');
	await t.dragToElement(paletteItem, Selector('#red-ui-workspace-chart'), {
		destinationOffsetX: 400,
		destinationOffsetY: nextNodeOffsetY
	});

	nextNodeOffsetY += 40;

	const nodeIdsAfter = await getExistingNodeIds();
	console.log(`Existing node ids on workspace after adding virtual switch: ${nodeIdsAfter.join(', ')}`);
	const newNodeIds = nodeIdsAfter.filter(id => !existingNodeIds.includes(id));
	if (newNodeIds.length !== 1) {
		throw new Error(`Expected exactly one new node to be added, but found ${newNodeIds.length}. Existing nodes: ${existingNodeIds.join(', ')}, nodes after: ${nodeIdsAfter.join(', ')}`);
	}
	return newNodeIds[0];
}

test('My second test', async t => {
	const flowId = await setupFlow(t, 'flow-switches-1');
	console.log(`Using flow ID: ${flowId}`);
	await t.navigateTo(`${NODE_RED_ENDPOINT}/#flow/${flowId}`);

	// reload the page, to ensure there is no 'review the changed' dialog
	await t.eval(() => location.reload(true));

	await t.doubleClick(Selector('#switch1'));
	await t.typeText('#node-input-name', 'switch-1-testcafe');

	// choose toggle node-input-switch_1_type to be value '7'
	await t.click('#node-input-switch_1_type');
	await t.click(Selector('#node-input-switch_1_type option').withText('Dimmable'));

	// set name and group
	await t.typeText('#node-input-switch_1_customname', 'switch-1-testcafe')
	await t.typeText('#node-input-switch_1_group', 'testcafe');

	// confirm dialog
	await t.click('#node-dialog-ok');

	// connect switch1 third output to debug node
	const source = Selector('#switch1').find('g.red-ui-flow-port-output').nth(1).find('.red-ui-flow-port');
	// console.log('Source selector:', await (Selector('#switch1').find('g.red-ui-flow-port-output').nth(2)()));
	const target = Selector('#debug_001').find('g.red-ui-flow-port-input .red-ui-flow-port');

	await t.setTestSpeed(0.5).dragToElement(source, target);

	// deploy
	await t.click('#red-ui-header-button-deploy');

	const notification = Selector('#red-ui-notifications div p').innerText;
	await t.expect(notification).eql('Successfully deployed');

	// click debug to open debug sidebar
	await t.click('#red-ui-tab-debug-link-button');
	await t.expect(Selector('.red-ui-debug-content').visible).ok();

	// click the switch to trigger the flow
	await dbus_SetValue(`com.victronenergy.switch.virtual_switch1`, '/SwitchableOutput/output_1/State', 'variant:int32:1');

	const state = await dbus_GetValue(`com.victronenergy.switch.virtual_switch1`, '/SwitchableOutput/output_1/State')
	console.log(`state after switching on: ${state}`);

	// switch off
	await dbus_SetValue(`com.victronenergy.switch.virtual_switch1`, '/SwitchableOutput/output_1/State', 'variant:int32:0');

	const state2 = await dbus_GetValue(`com.victronenergy.switch.virtual_switch1`, '/SwitchableOutput/output_1/State')
	console.log(`state after switching off: ${state2}`);

	// TODO: add assertions

	// determine the ids of existing nodes on #red-ui-workspace-chart
	const existingNodeIds = await getExistingNodeIds();
	console.log(`Existing node ids on workspace: ${existingNodeIds.join(', ')}`);

	// add another virtual switch, by drag n drop
	const paletteItem = Selector('.red-ui-palette-node[data-palette-type="victron-virtual-switch"]').find('.red-ui-palette-label');
	await t.dragToElement(paletteItem, Selector('#red-ui-workspace-chart'));

	const existingNodeIdsAfter = await getExistingNodeIds();
	console.log(`Existing node ids on workspace after adding virtual switch: ${existingNodeIdsAfter.join(', ')}`);

	const newSwitch1Id = await addVirtualSwitchNode(t);
	console.log(`New virtual switch node id: ${newSwitch1Id}`);

	const newSwitch2Id = await addVirtualSwitchNode(t);
	console.log(`New virtual switch node id: ${newSwitch2Id}`);


});



