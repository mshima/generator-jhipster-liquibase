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

/**
 * Apply changelogs
 * @param {Array} changelogsToApply - Changelogs to apply.
 * @param {String} entityName - Entity name to filter.
 * @param {Boolean} returnRemoved - Add removedFields and removedRelationships to the returned object
 * @returns {any} The Entity definition.
 */
const applyChangelogs = function (changelogsToApply, entityName, returnRemoved) {
  if (!changelogsToApply) {
    return undefined;
  }

  const context = {fields: [], relationships: []};
  let initialized = false;
  changelogsToApply.forEach(changelog => {
    if (changelog.entityName !== entityName) {
      return;
    }

    if (changelog.type === 'entity-new' || changelog.type === 'entity-snapshot') {
      Object.assign(context, changelog.definition);
      initialized = true;
    }

    if (!initialized) {
      throw new Error(
        `Error applying changelogs, entity ${entityName} was not initialized at changelog ${changelog.changelogDate}`
      );
    }

    const removedFields = [];
    if (changelog.removedFields) {
      context.fields = context.fields.filter(field => {
        const isRemoved = changelog.removedFields.includes(field.fieldName);
        if (isRemoved) {
          removedFields.push(field);
        }

        return !isRemoved;
      });
    }

    const removedRelationships = [];
    if (changelog.removedRelationships) {
      context.relationships = context.relationships.filter(rel => {
        const isRemoved = changelog.removedRelationships.includes(`${rel.relationshipName}:${rel.relationshipType}`);
        if (isRemoved) {
          removedRelationships.push(rel);
        }

        return !isRemoved;
      });
    }

    if (returnRemoved) {
      context.removedFields = removedFields;
      context.removedRelationships = removedRelationships;
    }

    if (changelog.addedFields) {
      context.fields = context.fields.concat(changelog.addedFields);
    }

    if (changelog.addedRelationships) {
      context.relationships = context.relationships.concat(changelog.addedRelationships);
    }
  });
  return context;
};

module.exports = {
  applyChangelogs
};
