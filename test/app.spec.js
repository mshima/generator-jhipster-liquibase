const path = require('path');
const fse = require('fs-extra');
const assert = require('yeoman-assert');
const helpers = require('yeoman-test');

describe('Subgenerator app of generator-jhipster-liquibase JHipster blueprint', () => {
  describe('Sample test', () => {
    let ctx;
    beforeEach(function () {
      this.timeout(10000);
      ctx = helpers
        .create('jhipster:app')
        .inTmpDir(dir => {
          fse.copySync(path.join(__dirname, '../test/templates/ngx-blueprint'), dir);
        })
        .withOptions({
          'from-cli': true,
          skipInstall: true,
          blueprints: ['liquibase']
        })
        .withLookups([
          {npmPaths: path.join(__dirname, '..', 'node_modules')},
          {packagePaths: path.join(__dirname, '..')}
        ])
        .build();
    });

    it('it works', function () {
      this.timeout(30000);
      return ctx.run().then(() => {
        assert(true);
      });
    });
  });
});
