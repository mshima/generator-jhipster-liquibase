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

const {applyChangelogs} = require('../../utils/incremental');

function createGenerator(env) {
  return class extends env.requireGenerator('jhipster:info') {
    constructor(args, options) {
      super(args, options);

      const yoRcFile = this.destinationPath('.yo-rc.json');
      this.changelogConfig = this.createStorage(yoRcFile, 'generator-jhipster.databaseChangelogs', true);
      this.jhipsterConfig = this.createStorage(yoRcFile, 'generator-jhipster');
      this.config = this.jhipsterConfig;
    }

    /**
     * Load entity and apply every changelog
     * @param {String} entityName - Entity to load
     * @param {String} [untilChangelog] - Apply changelogs less than or equals
     * @returns {Object} Entity definition.
     */
    loadDatabaseChangelogEntity(entityName, untilChangelog, returnRemoved) {
      const toApply = this.loadDatabaseChangelogs(
        changelog =>
          changelog.entityName === entityName && (!untilChangelog || changelog.changelogDate <= untilChangelog)
      );
      const entity = applyChangelogs(toApply, entityName, returnRemoved);
      entity.name = entity.name || entityName;
      return entity;
    }

    /**
     * Load ordered changelogs
     * @param {any} [filter] - lodash filter
     * @returns {Array} Array of changelogs
     */
    loadDatabaseChangelogs(filter) {
      const databaseChangelogs = this.jhipsterConfig.get('databaseChangelogs');
      if (!databaseChangelogs) {
        this.warning('Cannot find any changelog');
        return [];
      }

      let changelogs = Object.values(databaseChangelogs);
      if (filter) {
        /* eslint-disable-next-line unicorn/no-fn-reference-in-iterator */
        changelogs = this._.filter(changelogs, filter);
      }

      function isBefore(changelog1, changelog2) {
        let diff = changelog1.changelogDate - changelog2.changelogDate;
        if (diff === 0 && changelog1.entityName && changelog2.entityName) {
          diff = changelog1.entityName > changelog2.entityName;
        }

        return diff;
      }

      // Sort by changelogDate
      changelogs.sort(isBefore);
      return changelogs;
    }

    /**
     * Creates a new changelog definition.
     * @param {String} type - Type of the changelog
     * @param {String} name - Name of the changelog or name of the entity
     * @param {String} changelogDate - ChangelogDate
     * @returns {Object} The changelog base definition
     */
    _createChangelogContext(type, name, changelogDate = this.dateFormatForLiquibase(false)) {
      if (!changelogDate) {
        throw new Error('No current changelog was found.');
      }

      if (this.changelogConfig.get(changelogDate)) {
        this.jhipsterConfig.set('lastLiquibaseTimestamp', this.jhipsterConfig.get('lastLiquibaseTimestamp') + 1);
      }

      const changelog = {type, changelogDate};
      if (type === 'custom' || type === 'tag') {
        changelog.name = name;
      } else if (type.startsWith('entity-')) {
        changelog.entityName = name;
      } else {
        // Add entity-snapshot, tag
        throw new Error(`Changelog of type ${type} not implemented`);
      }

      let hasChanged = false;
      const self = this;
      return {
        getChangelog() {
          return changelog;
        },
        get(key) {
          return changelog[key];
        },
        set(key, value) {
          hasChanged = true;
          changelog[key] = value;
        },
        save(force = false) {
          if (!force && !hasChanged) {
            return false;
          }

          self.changelogConfig.set(changelog.changelogDate, changelog);
          self._debug('Saved changelog %o', changelog);
          return true;
        }
      };
    }

    /**
     * Generate changelog from differences between the liquibase entity and current entity.
     */
    _generateChangelogFromDiff(entities) {
      const relationshipsChangelogs = [];
      const savedChangelogs = [];
      // Compare entity changes and create changelogs
      entities.forEach(loaded => {
        const entity = {...loaded.definition};
        const entityName = entity.name || loaded.name;
        this._debug(`Calculating diffs for ${entityName}`);

        const dbEntity = this.loadDatabaseChangelogEntity(entityName);
        const fields = entity.fields;
        const relationships = entity.relationships;

        const currentFields = dbEntity.fields || [];
        // Calculate new fields
        const addedFields = fields.filter(
          field => !currentFields.find(fieldRef => fieldRef.fieldName === field.fieldName)
        );
        // Calculate removed fields
        const removedFields = currentFields.filter(
          field => !fields.find(fieldRef => fieldRef.fieldName === field.fieldName)
        );

        if (addedFields.length > 0 || removedFields.length > 0) {
          // Create a new changelog of type entity-fields
          const changelogContext = this._createChangelogContext('entity-fields', entityName);
          if (addedFields.length > 0) {
            this._debug('addedFields: %o', addedFields);
            changelogContext.set('addedFields', addedFields);
          }

          if (removedFields.length > 0) {
            this._debug('removedFields: %o', removedFields);
            changelogContext.set(
              'removedFields',
              removedFields.map(field => field.fieldName)
            );
          }

          if (changelogContext.save()) {
            // Multiples changelogs can be found.
            // If persisted then run a full regeneration.
            savedChangelogs.push(changelogContext.getChangelog());
          }
        }

        // Calculate new relationships
        const addedRelationships = relationships.filter(
          relationship =>
            !dbEntity.relationships.find(relRef => {
              const refName = relRef.relationshipName || relRef.otherEntityName;
              const name = relationship.relationshipName || relationship.otherEntityName;
              return refName === name;
            })
        );

        // Calculate removed relationships
        const removedRelationships = dbEntity.relationships.filter(
          relationship =>
            !relationships.find(relRef => {
              const refName = relRef.relationshipName || relRef.otherEntityName;
              const name = relationship.relationshipName || relationship.otherEntityName;
              return refName === name;
            })
        );

        if (addedRelationships.length > 0 || removedRelationships.length > 0) {
          const changedRelationships = {entityName};
          if (addedRelationships.length > 0) {
            this._debug('addedRelationships: %o', addedRelationships);
            changedRelationships.addedRelationships = addedRelationships;
          }

          if (removedRelationships.length > 0) {
            this._debug('removedRelationships: %o', removedRelationships);
            changedRelationships.removedRelationships = removedRelationships.map(
              rel => `${rel.relationshipName}:${rel.relationshipType}`
            );
          }

          // Delay (due to timestamp) the relationship generation so every new entity is created.
          relationshipsChangelogs.push(changedRelationships);
        }
      });

      // Create relationships changelogs
      relationshipsChangelogs.forEach(changedRelationships => {
        const changelogContext = this._createChangelogContext('entity-relationships', changedRelationships.entityName);
        if (changedRelationships.addedRelationships) {
          changelogContext.set('addedRelationships', changedRelationships.addedRelationships);
        }

        if (changedRelationships.removedRelationships) {
          changelogContext.set('removedRelationships', changedRelationships.removedRelationships);
        }

        if (changelogContext.save()) {
          savedChangelogs.push(changelogContext.getChangelog());
        }
      });

      return savedChangelogs;
    }

    /**
     * Write changelog
     */
    _writeChangelog(databaseChangelog) {
      this._debug('Regenerating changelog %s', databaseChangelog.changelogDate);
      const versionedDatabase = this.jhipsterConfig.get('versionedDatabase');
      const generator =
        versionedDatabase === 'liquibase' ? 'jhipster-liquibase:versioned-database-liquibase' : versionedDatabase;
      this.composeWith(generator, {databaseChangelog});
    }

    /**
     * Format As Liquibase Remarks
     *
     * @param {string} text - text to format
     * @param {boolean} addRemarksTag - add remarks tag
     * @returns formatted liquibase remarks
     */
    formatAsLiquibaseRemarks(text, addRemarksTag = false) {
      if (!text) {
        return addRemarksTag ? '' : text;
      }

      const description = super.formatAsLiquibaseRemarks(text);
      return addRemarksTag ? ` remarks="${description}"` : description;
    }

    /**
     * Calculate new changelogs.
     *
     * @param {String} [entityName] - Create changelog for only one entity.
     */
    _updateChangelogsFromEntities(entityName) {
      let entities = this.getExistingEntities();
      if (entityName) {
        this._debug(`Found entities ${entities.map(entity => entity.name).join(', ')}`);
        this._debug(`Filtering entity ${entityName}`);
        entities = entities.filter(entity => entity.name === entityName);
      }

      this._debug(`Updating or creating changelog for ${entities.map(entity => entity.name).join(', ')}`);
      const changelogs = this._generateChangelogFromDiff(entities);
      if (entityName) {
        // If entityName, this generator was called by entity generator, so write the changelog
        changelogs.forEach(changelog => this._writeChangelog(changelog));
      }
    }
  };
}

module.exports = {
  createGenerator
};
