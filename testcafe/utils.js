const { readFileSync } = require('fs');

export const NODE_RED_ENDPOINT = process.env.NODE_RED_ENDPOINT || 'http://localhost:1880';

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

