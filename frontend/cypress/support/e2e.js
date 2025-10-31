// Cypress support file
// You can add custom commands or hooks here

beforeEach(() => {
  // Clear localStorage between tests
  cy.clearLocalStorage();
  // Clear session storage as well
  cy.window().then((win) => win.sessionStorage.clear());
});
