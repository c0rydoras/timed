import { expect } from 'chai'
import { describe, it } from 'mocha'
import { setupTest } from 'ember-mocha'

describe('Unit | Route | users/edit/credits/overtime credits/edit', function() {
  setupTest('route:users/edit/credits/overtime-credits/edit', {
    // Specify the other units that are required for this test.
    // needs: ['controller:foo']
  })

  it('exists', function() {
    let route = this.subject()
    expect(route).to.be.ok
  })
})
