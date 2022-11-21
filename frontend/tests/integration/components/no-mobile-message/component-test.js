import { hbs } from 'ember-cli-htmlbars';
import { render } from "@ember/test-helpers";
import { setupRenderingTest } from "ember-qunit";
import { module, test } from "qunit";

module("Integration | Component | no mobile message", function(hooks) {
  setupRenderingTest(hooks);

  test("renders", async function(assert) {
    await render(hbs`{{no-mobile-message}}`);
    assert.ok(this.element);
  });
});
