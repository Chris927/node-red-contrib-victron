const { readFileSync } = require('fs');
const { exec } = require('child_process');

const { Selector } = require("testcafe");

const NODE_RED_ENDPOINT = process.env.NODE_RED_ENDPOINT || 'http://localhost:1880';

const SSH_COMMAND = process.env.SSH_COMMAND || 'ssh -p 2232 root@localhost';

const { SWITCH_TYPE_MAP, SWITCH_TYPE_NAMES } = require('../src/nodes/victron-virtual-constants.js');

function getSwitchTypeCodeForName(name) {
	for (const [code, typeName] of Object.entries(SWITCH_TYPE_NAMES)) {
		if (typeName === name) {
			return code;
		}
	}
	throw new Error(`Unknown switch type name: ${name}`);
}

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
	// console.log(`Executing command: ${command}`);
	// retry max 3 times
	for (let attempt = 1; attempt <= 3; attempt++) {
		try {
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

async function getExistingNodeIds() {
	const existingNodes = Selector('#red-ui-workspace-chart .red-ui-flow-node.red-ui-flow-node-group');
	// iterate all that match
	const count = await existingNodes.count;
	console.log(`Found ${count} existing nodes on workspace`);
	return Promise.all(Array.from({ length: count }, (_, i) => existingNodes.nth(i).getAttribute('id')));
}

let nextNodeOffsetY = 200;

function resetFlowNodeOffset() {
	nextNodeOffsetY = 200;
}

async function addVirtualSwitchNode(t) {

	const existingNodeIds = await getExistingNodeIds();
	console.log(`Existing node ids on workspace before adding virtual switch: ${existingNodeIds.join(', ')}`);

	const paletteItem = Selector('.red-ui-palette-node[data-palette-type="victron-virtual-switch"]').find('.red-ui-palette-label');
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

/**
		* Configure a virtual switch node by opening its configuration dialog and setting the provided options.
		* @param {TestController} t - The TestCafe test controller.
		* @param {string} nodeId - The ID of the virtual switch node to configure.
		* @param {Object} options - An array of options to set, with each option having name, value, and type. The name maps to a selector `#node-input-${name}`. The value is the value to set, and the type can be 'text' (default), or 'select' (for dropdowns).
		*/
async function configureVirtualSwitchNode(t, nodeId, options) {
	console.log(`configureVirtualSwitchNode, nodeId: ${nodeId}, options: ${JSON.stringify(options)}`);
	const nodeSelector = Selector('g').withAttribute('id', nodeId);
	await t.doubleClick(nodeSelector);

	for (const option of options) {
		const { name, value, type = 'text' } = option;
		const inputSelector = Selector(`#node-input-${name}`);
		if (type === 'text') {
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

async function confirmNodeDialog(t) {
	await t.click('#node-dialog-ok');
}

async function deploy(t) {

	await t.click('#red-ui-header-button-deploy');

	const notification = Selector('#red-ui-notifications div p').innerText;
	await t.expect(notification).eql('Successfully deployed');

}

test('My second test', async t => {
	const flowId = await setupFlow(t, 'flow-switches-1');
	console.log(`Using flow ID: ${flowId}`);
	await t.navigateTo(`${NODE_RED_ENDPOINT}/#flow/${flowId}`);

	// reload the page, to ensure there is no 'review the changed' dialog
	await t.eval(() => location.reload(true));

	// wait for the tab to be active
	await t.expect(Selector('.red-ui-tab.active').withAttribute('id', `red-ui-tab-${flowId}`).exists).ok('Flow tab did not become active');

	console.log(`Tab for flow ${flowId} is active`);

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

	await deploy(t);

	// click debug to open debug sidebar
	await t.click('#red-ui-tab-debug-link-button');
	await t.expect(Selector('.red-ui-debug-content').visible).ok();

	// click the switch to trigger the flow
	await dbus_SetValue(`com.victronenergy.switch.virtual_switch1`, '/SwitchableOutput/output_1/State', 'variant:int32:1');

	const state = await dbus_GetValue(`com.victronenergy.switch.virtual_switch1`, '/SwitchableOutput/output_1/State')
	console.log(`state after switching on: ${state}`);
	// assert state contains 'int32 1'
	await t.expect(state).contains('int32 1');

	// switch off
	await dbus_SetValue(`com.victronenergy.switch.virtual_switch1`, '/SwitchableOutput/output_1/State', 'variant:int32:0');

	const state2 = await dbus_GetValue(`com.victronenergy.switch.virtual_switch1`, '/SwitchableOutput/output_1/State')
	console.log(`state after switching off: ${state2}`);
	// assert state contains 'int32 0'
	await t.expect(state2).contains('int32 0');

	// determine the ids of existing nodes on #red-ui-workspace-chart
	const existingNodeIds = await getExistingNodeIds();
	console.log(`Existing node ids on workspace: ${existingNodeIds.join(', ')}`);

	// add another virtual switch, by drag n drop
	const paletteItem = Selector('.red-ui-palette-node[data-palette-type="victron-virtual-switch"]').find('.red-ui-palette-label');
	await t.dragToElement(paletteItem, Selector('#red-ui-workspace-chart'));

	const existingNodeIdsAfter = await getExistingNodeIds();
	console.log(`Existing node ids on workspace after adding virtual switch: ${existingNodeIdsAfter.join(', ')}`);


});

async function assertVirtualSwitchHasDbusValue(t, nodeId, path, expectedValue) {
	const state = await dbus_GetValue(`com.victronenergy.switch.virtual_${nodeId}`, path)
	console.log(`state after switching on: ${state}`);
	await t.expect(state).contains(expectedValue);
}


test('Test Switches, starting with empty flow', async t => {
	const flowId = await setupFlow(t, 'empty-flow');
	resetFlowNodeOffset();
	console.log(`Using flow ID: ${flowId}`);
	await t.navigateTo(`${NODE_RED_ENDPOINT}/#flow/${flowId}`);

	// reload the page, to ensure there is no 'review the changed' dialog
	await t.eval(() => location.reload(true));

	// wait for the tab to be active
	await t.expect(Selector('.red-ui-tab.active').withAttribute('id', `red-ui-tab-${flowId}`).exists).ok('Flow tab did not become active');

	console.log(`Tab for flow ${flowId} is active`);

	// add a virtual switch node
	const newSwitch1Id = await addVirtualSwitchNode(t);
	console.log(`New virtual switch node id: ${newSwitch1Id}`);

	const switchesToTest = [
		{
			name: 'momentary1',
			type: 'Momentary'
		},
		{
			name: 'toggle1',
			type: 'Toggle'
		},
		{
			name: 'dimmable1',
			type: 'Dimmable'
		},
		{
			name: 'temp1',
			type: 'Temperature setpoint',
			props: [
				{
					switch_1_min: '0',
					switch_1_max: '30',
					switch_1_step: '0.5'
				}
			]
		},
		{
			name: 'stepped1',
			type: 'Stepped switch',
			props: [
				{
					switch_1_max: '12',
				}
			]
		},
		{
			name: 'dropdown1',
			type: 'Dropdown',
			props: [
				{
					switch_1_count: '3',
					switch_1_value_0: 'option one',
					switch_1_value_1: 'option two',
					switch_1_value_2: 'option three',
				}
			]
		},
		{
			name: 'slider1',
			type: 'Basic slider',
			props: [
				{
					switch_1_min: '0',
					switch_1_max: '100',
					switch_1_step: '2',
					switch_1_unit: '%',
				}
			]
		},
		{
			name: 'numeric1',
			type: 'Numeric input',
			props: [
				{
					switch_1_min: '-50',
					switch_1_max: '70',
					switch_1_step: '0.5',
					switch_1_unit: '°C',
				}
			]
		},
		{
			name: 'threestate1',
			type: 'Three-state switch',
		},
		{
			name: 'bilgepump1',
			type: 'Bilge pump control',
		},
		{
			name: 'rgb1',
			type: 'RGB control',
		}
	]

	for (const switchConfig of switchesToTest) {
		console.log(`Testing switch type: ${switchConfig.type}, name: ${switchConfig.name}`);
		const newSwitchId = await addVirtualSwitchNode(t);
		console.log(`New virtual switch node id: ${newSwitchId}, name: ${switchConfig.name}, type: ${switchConfig.type}`);

		const options = [
			{ name: 'name', value: switchConfig.name },
			{ name: 'switch_1_type', value: switchConfig.type, type: 'select' },
			{ name: 'switch_1_customname', value: switchConfig.name },
			{ name: 'switch_1_group', value: 'testcafe' },
		];

		if (switchConfig.props) {
			for (const prop of switchConfig.props) {
				for (const [key, value] of Object.entries(prop)) {
					options.push({ name: key, value });
				}
			}
		}

		function getOptionsValue(name) {
			const option = options.find(o => o.name === name);
			if (!option) {
				throw new Error(`Option with name ${name} not found`);
			}
			return option.value;
		}

		await configureVirtualSwitchNode(t, newSwitchId, options);

		await confirmNodeDialog(t);

		await deploy(t);

		// assert the node is visible via dbus with the correct values
		await assertVirtualSwitchHasDbusValue(
			t, newSwitchId, '/SwitchableOutput/output_1/State', 'int32 0');
		await assertVirtualSwitchHasDbusValue(
			t, newSwitchId, '/SwitchableOutput/output_1/Settings/CustomName', `string "${getOptionsValue('name')}"`);
		await assertVirtualSwitchHasDbusValue(
			t, newSwitchId, '/SwitchableOutput/output_1/Settings/Group', `string "${getOptionsValue('switch_1_group')}"`);
		await assertVirtualSwitchHasDbusValue(
			t, newSwitchId, '/SwitchableOutput/output_1/Settings/Type', `int32 ${getSwitchTypeCodeForName(getOptionsValue('switch_1_type'))}`);
	}



});


