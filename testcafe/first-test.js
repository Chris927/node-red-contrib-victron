const { Selector } = require("testcafe");

fixture('Getting Started')
  .page('https://devexpress.github.io/testcafe/example');

test('My first test', async t => {
  await t.typeText('#developer-name', 'John Smith');

  await t.click('#submit-button');

  const thankYouHeader = await Selector('.result-content h1').innerText;
  await t.expect(thankYouHeader).eql('Thank you, John Smith!');


});


