const assert = require('yeoman-assert');
const helpers = require('yeoman-test');
const path = require('path');
const fse = require('fs-extra');

const SERVER_MAIN_RES_DIR = 'src/main/resources/';

describe('JHipster application generator with liquibase', () => {
  describe('generate application with liquibase changelogs', () => {
    before(function () {
      this.timeout(30000);
      return helpers
        .create('jhipster-liquibase:versioned-database')
        .inTmpDir(dir => {
          console.log(dir);
          fse.copySync(path.join(__dirname, 'templates/liquibase-default'), dir);
        })
        .withOptions({init: true, apply: 'liquibase.json'})
        .withLookups([
          {npmPaths: path.join(__dirname, '..', 'node_modules')},
          {packagePaths: path.join(__dirname, '..')}
        ])
        .run();
    });

    const changelogFileExists = file => {
      assert.file(`${SERVER_MAIN_RES_DIR}${file}`);
      assert.fileContent(`${SERVER_MAIN_RES_DIR}config/liquibase/master.xml`, file);
    };

    const changelogFileDoesntExists = file => {
      assert.noFile(`${SERVER_MAIN_RES_DIR}${file}`);
      assert.noFileContent(`${SERVER_MAIN_RES_DIR}config/liquibase/master.xml`, file);
    };

    [
      {
        changelogDate: '20150805124838',
        type: 'entity-new',
        entityName: 'BankAccount',
        hasConstraints: true
      },
      {
        changelogDate: '20200302000000',
        type: 'entity-fields',
        entityName: 'Operation',
        hasConstraints: true
      },
      {
        changelogDate: '20200302000001',
        type: 'entity-fields',
        entityName: 'Operation'
      },
      {
        changelogDate: '20200302000002',
        type: 'tag',
        name: 'v1.0.0',
        hasConstraints: true
      },
      {
        changelogDate: '20200302000003',
        type: 'entity-relationships',
        entityName: 'BankAccount'
      },
      {
        changelogDate: '20200302000004',
        type: 'entity-relationships',
        entityName: 'Operation',
        hasConstraints: true
      }
    ].forEach(changelog => {
      it(`changelog ${changelog.changelogDate} of type ${changelog.type}, name ${changelog.entityName} is created and added to master.xml`, () => {
        if (changelog.type === 'entity-new') {
          const addedFile = `config/liquibase/changelog/${changelog.changelogDate}_added_entity_${changelog.entityName}.xml`;
          const constrainFile = `config/liquibase/changelog/${changelog.changelogDate}_added_entity_constraints_${changelog.entityName}.xml`;
          changelogFileExists(addedFile);
          changelogFileExists(constrainFile);
        } else if (changelog.type !== 'entity-snapshot' && changelog.type.startsWith('entity-')) {
          const updatedFile = `config/liquibase/changelog/${changelog.changelogDate}_updated_entity_${changelog.entityName}.xml`;
          const constrainFile = `config/liquibase/changelog/${changelog.changelogDate}_updated_entity_constraints_${changelog.entityName}.xml`;
          changelogFileExists(updatedFile);
          if (changelog.hasConstraints) {
            changelogFileExists(constrainFile);
          } else {
            changelogFileDoesntExists(constrainFile);
          }
        } else if (changelog.type === 'tag') {
          const relPath = `config/liquibase/changelog/${changelog.changelogDate}_tag_${changelog.name}.xml`;
          changelogFileExists(relPath);
          assert.fileContent(`${SERVER_MAIN_RES_DIR}${relPath}`, 'tagDatabase');
          assert.fileContent(`${SERVER_MAIN_RES_DIR}${relPath}`, changelog.name);
        }
      });
    });
  });
});
