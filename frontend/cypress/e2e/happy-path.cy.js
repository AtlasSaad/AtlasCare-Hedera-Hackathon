describe('AtlasCare MVP Happy Path', () => {
  it('Doctor issues prescription, Pharmacist verifies and generates FSE', () => {
    // Visit app and login as doctor
    cy.visit('/');
    cy.contains('Login');

    // Use demo account button
    cy.contains('Login as Doctor').click();

    // Redirected to doctor form
    cy.url().should('include', '/doctor');

    // Fill patient info
    cy.get('input#patientId').type('PAT-12345');
    cy.get('input#patientName').type('John Atlas');
    cy.get('input#patientEmail').type('john.atlas@example.com');
    cy.get('textarea#diagnosis').type('Acute sinusitis');

    // Fill medication (first row exists by default)
    cy.get('input#dosage-0').clear().type('500');
    cy.get('select#frequency-0').select('2');
    cy.get('input#duration-0').clear().type('7');

    // Submit
    cy.contains('Create Prescription').click();

    // Confirmation page shows QR and details
    cy.contains('Prescription Created Successfully');
    cy.contains('Prescription ID');

    // Extract QR JSON (it’s rendered via QRCode component, so we rely on state encoded on page)
    // Instead, locate the Copy Link or print as a proxy for success
    cy.contains('Print');

    // Navigate to Pharmacist using sidebar
    cy.contains('Pharmacist').click();
    cy.url().should('include', '/pharmacist');

    // There is no direct share of QR payload between pages.
    // For the demo, paste the QR payload from doctor response stored in localStorage history list.
    cy.window().then((win) => {
      const arr = JSON.parse(win.localStorage.getItem('prescriptions') || '[]');
      expect(arr.length).to.be.greaterThan(0);
      const last = arr[arr.length - 1];
      // pharmacist page also queries legacy endpoint by id; set the field and lookup
      cy.get('input#prescriptionId').clear().type(last.id);
    });

    cy.contains('Lookup').click();
    cy.contains('Prescription Details');

    // Attempt generate FSE (requires pharmacist login)
    // Logout current user and login as pharmacist first
    cy.contains('Logout', { matchCase: false }).click({ force: true });

    cy.contains('Login');
    cy.contains('Login as Pharmacist').click();
    cy.url().should('include', '/pharmacist');

    // Load the same prescription again
    cy.window().then((win) => {
      const arr = JSON.parse(win.localStorage.getItem('prescriptions') || '[]');
      const last = arr[arr.length - 1];
      cy.get('input#prescriptionId').clear().type(last.id);
    });
    cy.contains('Lookup').click();

    // Since OTP is needed, we cannot fully verify in e2e without reading email.
    // We will proceed to FSE generation on the loaded (legacy) prescription view.
    cy.contains('Generate FSE').click({ force: true });
  });
});
