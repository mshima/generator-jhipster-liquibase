/**
 * Copyright 2013-2020 the original author or authors from the JHipster project.
 *
 * This file is part of the JHipster project, see https://www.jhipster.tech/
 * for more information.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const fs = require('fs');


function createGenerator(env) {
  const packagePath = env.getPackagePath('jhipster');
  const {parseLiquibaseChangelogDate} = require(`${packagePath}/utils/liquibase`);
  return class extends env.requireGenerator('jhipster-liquibase:base') {
    constructor(args, options) {
      super(args, options);

      this.configOptions = this.options.configOptions || {};

      this.option('init', {
        type: String,
        required: false,
        description: 'Initialize versioned database'
      });

      this.option('apply', {
        type: String,
        required: false,
        description: 'External file to apply'
      });

      this.option('customChangelog', {
        type: String,
        required: false,
        description: 'Add a custom changelog entry to master.xml'
      });

      this.option('snapshot', {
        type: String,
        required: false,
        description: 'Add a changelog breaking point for custom changes'
      });

      this.option('tag', {
        type: String,
        required: false,
        description: 'Create a tag changelog'
      });

      // This adds support for a `--from-cli` flag
      this.option('from-cli', {
        desc: 'Indicates the command is run from JHipster CLI',
        type: Boolean,
        defaults: false
      });

      this.option('regenerate', {
        desc: 'Regenerate the changelog',
        type: Boolean,
        defaults: false
      });

      this.option('update', {
        desc: 'Update based on the current entity',
        type: Boolean,
        defaults: false
      });

      this.option('generate', {
        desc: 'Generate the changelog',
        type: Boolean,
        defaults: false
      });

      this.option('entity', {
        desc: 'Name of the entity to update',
        type: String
      });

      this.option('new-entity', {
        desc: 'Create a new changelog for the entity',
        type: Boolean,
        defaults: false
      });

      this.registerPrettierTransform();
    }

    _initializing() {
      return {
        validateFromCli() {
          this.checkInvocationFromCLI();
        },

        /**
         * Display jhipster logo
         */
        displayLogo() {
          if (this.logo) {
            this.printJHipsterLogo();
          }
        }
      };
    }

    get initializing() {
      return this._initializing();
    }

    _prompting() {
      return {};
    }

    get prompting() {
      return this._prompting();
    }

    _configuring() {
      return {
        /**
         * Loads last changelogDate
         */
        initChangelogDate() {
          this._loadLastChangelogDate();
        },

        initOrDiffIncrementalChangelog() {
          if (this.jhipsterConfig.get('versionedDatabase')) {
            this._updateChangelogsFromEntities();
          } else {
            this.jhipsterConfig.set('versionedDatabase', 'liquibase');
            this._initializeIncrementalChangelog();
          }
        },

        /**
         * Apply external changelogs
         */
        applyExternalChangelogs() {
          if (!this.options.apply) {
            return;
          }

          this._debug('Applying external changelogs');
          const externalFile = JSON.parse(fs.readFileSync(this.options.apply));
          const changelogEntityNames = Object.values(externalFile)
            .map(changelog => changelog.entityName)
            .filter(entityName => entityName);
          this.appliedChangelogs = [...new Set(changelogEntityNames)];
          this.changelogConfig.set(externalFile);
          this.getExistingEntities().forEach(definition => {
            const entity = this.loadDatabaseChangelogEntity(definition.name);
            this.fs.writeJSON(this.destinationPath(`.jhipster/${definition.name}.json`), entity);
          });
          this.fullRegeneration = this.appliedChangelogs.length > 0;
        },

        /**
         * Validate current changelogs
         */
        validateChangelogs() {
          this.loadDatabaseChangelogs().forEach(changelog => {
            if (!changelog.changelogDate) {
              throw new Error('Changelog must have a changelogDate');
            }

            if (!changelog.type) {
              throw new Error('Changelog must have a type');
            }
          });
        },

        /**
         * Consolidate applied changelogs.
         */
        applyChangelogs() {
          if (!this.options.apply) {
            return;
          }

          this.appliedChangelogs.forEach(entityName => {
            const entityConfig = this.createStorage(`.jhipster/${entityName}.json`);
            // Update entity definition.
            entityConfig.set(this.loadDatabaseChangelogEntity(entityName));
          });
        }
      };
    }

    get configuring() {
      return this._configuring();
    }

    _default() {
      return {
        runCommands() {
          if (this.options.customChangelog) {
            const changelogContext = this._createChangelogContext('custom', this.options.customChangelog);
            changelogContext.save(true);
            this._writeChangelog(changelogContext.getChangelog());
            return;
          }

          if (this.options.tag) {
            const changelogContext = this._createChangelogContext('tag', this.options.tag);
            changelogContext.save(true);
            this._writeChangelog(changelogContext.getChangelog());
            return;
          }

          if (this.options.snapshot) {
            const entityName = this.options.snapshot;
            const entity = this.loadDatabaseChangelogEntity(entityName);
            if (!entity) {
              this.env.error(`Entity ${entityName} was not found`);
            }

            const changelogContext = this._createChangelogContext('entity-snapshot', entityName);
            changelogContext.set('definition', entity.definition);
            changelogContext.save(true);
            this._writeChangelog(changelogContext.getChangelog());
          }
        }
      };
    }

    get default() {
      return this._default();
    }

    _writing() {
      return {
        regenerate() {
          if (this.fullRegeneration) {
            this._debug('Running full regeneration');
            const configOptions = this.options.configOptions;
            this.composeWith('jhipster:app', {
              'with-entities': true,
              configOptions,
              'from-cli': true,
              'skip-install': true,
              debug: this.isDebugEnabled
            });
            // A full regeneration is queued, stop this generator.
            this.cancelCancellableTasks();
            return;
          }

          const {regenerate} = this.options;
          if (!regenerate) {
            this._debug('Skipping changelog regeneration');
            return;
          }

          this._debug('Regenerating changelogs');
          this._regenerate();
        }
      };
    }

    get writing() {
      return this._writing();
    }

    _install() {
      return {};
    }

    get install() {
      return this._install();
    }

    _end() {
      return {};
    }

    get end() {
      return this._end();
    }

    /* ======================================================================== */
    /* private methods use within generator                                     */
    /* ======================================================================== */

    /**
     * Update lastLiquibaseTimestamp config.
     */
    _loadLastChangelogDate() {
      const changelog = this.loadDatabaseChangelogs().pop();
      if (!changelog) {
        return;
      }

      const changelogDate = changelog.changelogDate;
      const lastLiquibaseTimestamp = this.jhipsterConfig.get('lastLiquibaseTimestamp');
      const timestamp = parseLiquibaseChangelogDate(changelogDate).getTime();
      if (!lastLiquibaseTimestamp || lastLiquibaseTimestamp < timestamp) {
        this._debug('Load lastLiquibaseTimestamp and update to %o', lastLiquibaseTimestamp);
        this.jhipsterConfig.set('lastLiquibaseTimestamp', timestamp);
      }
    }

    /**
     * Regenerate changelogs.
     */
    _regenerate() {
      const ordered = this.loadDatabaseChangelogs();
      if (!ordered) {
        return;
      }

      // Generate in order
      ordered.forEach(item => {
        this._writeChangelog(item);
      });
    }

    /**
     * Convert a project to a versioned database.
     */
    _initializeIncrementalChangelog() {
      const changelogs = this.changelogConfig.getAll();
      if (this.getExistingEntities().length === 0 || (changelogs !== undefined && Object.keys(changelogs).length > 0)) {
        return;
      }

      this.jhipsterConfig.set('databaseChangelogs', {});

      this._debug('Initializing incremental changelog');
      let lastLiquibaseTimestamp;
      this.getExistingEntities().forEach(entity => {
        const changelogDate = entity.definition.changelogDate;
        if (this.changelogConfig.get(changelogDate)) {
          throw new Error(`Duplicate changelogDate ${changelogDate}`);
        }

        const changelogContext = this._createChangelogContext('entity-new', entity.name, changelogDate);
        changelogContext.set('definition', entity.definition);
        changelogContext.set('migration', true);
        changelogContext.save();
        lastLiquibaseTimestamp = parseLiquibaseChangelogDate(changelogDate).getTime();
      });
      if (lastLiquibaseTimestamp && lastLiquibaseTimestamp > this.jhipsterConfig.get('lastLiquibaseTimestamp')) {
        this._debug('Set lastLiquibaseTimestamp to %o', lastLiquibaseTimestamp);
        this.jhipsterConfig.set('lastLiquibaseTimestamp', lastLiquibaseTimestamp);
      }
    }
  };
}

module.exports = {
  createGenerator
};
