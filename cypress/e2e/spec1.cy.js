describe('template spec', () => {
  it('passes', () => {
    cy.visit('https://example.cypress.io')
    cy.get('ul.home-list > li:nth-child(1) > a:nth-child(1)').click();
    cy.contains("To find elements by data")
  })
});

it('spec-add-node', function() {
  cy.visit('http://localhost:1880/#flow/51e29eef710f16fc')
  
  cy.get('#red-ui-palette-search input.red-ui-searchBox-input').click();
  cy.get('#red-ui-palette-search input.red-ui-searchBox-input').type('switch');
  cy.get('#red-ui-palette-Victron_Energy div[data-palette-type="victron-virtual-switch"] div.red-ui-palette-label').click();
  
});

it('spec-configure-switch', function() {
  cy.visit('http://localhost:1880/#flow/f5b4d186930f9bf9')
  
  cy.get('#red-ui-workspace-chart rect.red-ui-flow-node').dblclick();
  // cy.get('#red-ui-workspace-chart rect.red-ui-flow-node').click();
  cy.get('#node-input-name').click();
  cy.get('#node-input-name').type('my-e2e-switch-1{enter}');
  cy.get('#node-input-switch_1_type').select('8');
  
  cy.get('#node-input-switch_1_customname').click();
  cy.get('#node-input-switch_1_customname').type('n1');
  cy.get('#node-input-switch_1_group').click();
  cy.get('#node-input-switch_1_group').type('g1');
  cy.get('#node-input-switch_1_max').click();
  cy.get('#node-input-switch_1_max').type('8');
  cy.get('#node-input-switch_1_unit').click();
  cy.get('#node-input-switch_1_unit').type('mm');
  cy.get('#node-dialog-ok').click();
  cy.get('#red-ui-header-button-deploy span.red-ui-deploy-button-content span').click();
});