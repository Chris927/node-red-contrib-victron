const { readFileSync } = require('fs');

const { Selector } = require("testcafe");

const NODE_RED_ENDPOINT = process.env.NODE_RED_ENDPOINT || 'http://localhost:1880';

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
	const source = Selector('#switch1').find('g.red-ui-flow-port-output').nth(2).find('.red-ui-flow-port');
	// console.log('Source selector:', await (Selector('#switch1').find('g.red-ui-flow-port-output').nth(2)()));
	const target = Selector('#debug_001').find('g.red-ui-flow-port-input .red-ui-flow-port');

	await t.setTestSpeed(0.5).dragToElement(source, target);

	// deploy
	await t.click('#red-ui-header-button-deploy');

	const notification = Selector('#red-ui-notifications div p').innerText;
	await t.expect(notification).eql('Successfully deployed');

});



