const assert = require('assert');
const chalk = require('chalk');

function createGenerator(env) {
  return class extends env.requireGenerator('jhipster-liquibase:base') {
    constructor(args, options) {
      super(args, options);

      this.jhipsterContext = this.options.jhipsterContext;

      if (!this.jhipsterContext) {
        throw new Error(
          `This is a JHipster blueprint and should be used only like ${chalk.yellow(
            'jhipster --blueprint generator-jhipster-liquibase'
          )}`
        );
      }

      this.sbsBlueprint = true;
    }

    get initializing() {
      return {};
    }

    get prompting() {
      return {};
    }

    get configuring() {
      return {};
    }

    get default() {
      return {
        composeLiquibase() {
          if (this.jhipsterContext.options.regenerate || !this.jhipsterConfig.get('versionedDatabase')) {
            return;
          }

          const context = this.jhipsterContext.context;
          if (context.useConfigurationFile) {
            this._updateChangelogsFromEntities(context.name);
          } else {
            this._createNewEntityChangelog(context.name);
          }

          this.composeWith('jhipster-liquibase:versioned-database', {
            context,
            entity: context.name,
            update: context.useConfigurationFile,
            force: context.options.force,
            debug: context.isDebugEnabled
          });
        }
      };
    }

    get writing() {
      return {};
    }

    get install() {
      return {};
    }

    get end() {
      return {};
    }

    /**
     * Create new entity.
     */
    _createNewEntityChangelog(entityName) {
      assert(entityName, 'Entity name is required');
      this._debug(`Creating a new changelog for entity ${entityName}`);
      const definition = this.fs.readJSON(`.jhipster/${entityName}.json`);
      this._debug(definition);
      const changelogDate = definition.changelogDate;
      if (this.changelogConfig.get(changelogDate)) {
        throw new Error(`Duplicate changelogDate ${changelogDate}`);
      }

      const changelogContext = this._createChangelogContext('entity-new', entityName, changelogDate);
      changelogContext.set('definition', definition);
      changelogContext.save();
      this._writeChangelog(changelogContext.getChangelog());
    }
  };
}

module.exports = {
  createGenerator
};
