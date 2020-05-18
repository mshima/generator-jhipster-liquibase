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

      this.configOptions = this.options.configOptions;
    }

    get initializing() {
      return {
        disableOldChangelog() {
          // Set skipDbChangelog so changelogs will be ignored at entity-* generators.
          this.jhipsterConfig.set('skipDbChangelog', true);
        }
      };
    }

    get prompting() {
      return {};
    }

    get configuring() {
      return {
        composeLiquibase() {
          if (this.getExistingEntities().length === 0) {
            return;
          }

          // If there is changelogs then liquibase should be call entities by changelog order.
          this.composeWith('jhipster-liquibase:versioned-database', {
            ...this.options,
            configOptions: this.configOptions,
            regenerate: true,
            'skip-install': true,
            debug: this.isDebugEnabled
          });
        }
      };
    }

    get default() {
      return {};
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
  };
}

module.exports = {
  createGenerator
};
