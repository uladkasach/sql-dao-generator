import { camelCase, snakeCase } from 'change-case';
import {
  DomainObjectMetadata,
  DomainObjectPropertyType,
  isDomainObjectArrayProperty,
  isDomainObjectReferenceProperty,
} from 'domain-objects-metadata';
import { isPresent } from 'simple-type-guards';

import { SqlSchemaReferenceMethod } from '../../../domain/objects/SqlSchemaReferenceMetadata';
import { SqlSchemaToDomainObjectRelationship } from '../../../domain/objects/SqlSchemaToDomainObjectRelationship';
import { UnexpectedCodePathDetectedError } from '../../UnexpectedCodePathDetectedError';
import { defineOutputTypeOfFoundDomainObject } from './defineOutputTypeOfFoundDomainObject';

export const defineDaoUtilCastMethodCodeForDomainObject = ({
  domainObject,
  sqlSchemaRelationship,
}: {
  domainObject: DomainObjectMetadata;
  sqlSchemaRelationship: SqlSchemaToDomainObjectRelationship;
}) => {
  // define some useful constants
  const hasUuidProperty = !!domainObject.properties.uuid;

  // define the referenced domain objects to hydrate
  const nestedDomainObjectNames = Object.values(domainObject.properties)
    .map((property) => {
      if (isDomainObjectReferenceProperty(property)) return property.of.name;
      if (isDomainObjectArrayProperty(property) && isDomainObjectReferenceProperty(property.of))
        return property.of.of.name;
      return null;
    })
    .filter(isPresent)
    .sort();

  // define the imports
  const imports = [
    // always present imports
    `import { HasId${hasUuidProperty ? ', HasUuid' : ''} } from 'simple-type-guards';`,
    '', // split module from relative imports
    `import { ${[domainObject.name, ...nestedDomainObjectNames].sort().join(', ')} } from '$PATH_TO_DOMAIN_OBJECT';`, // import this domain object; note: higher level function will swap out the import path
    `import { SqlQueryFind${domainObject.name}ByIdOutput } from '$PATH_TO_GENERATED_SQL_TYPES';`,
  ];

  // define the output type
  const outputType = defineOutputTypeOfFoundDomainObject(domainObject);

  // define the properties
  const propertiesToInstantiate = [
    ...sqlSchemaRelationship.properties.map(({ sqlSchema: sqlSchemaProperty, domainObject: domainObjectProperty }) => {
      // if domain object property is not defined, then no need to define how to cast from it
      if (!domainObjectProperty) return null;

      // enum case
      if (domainObjectProperty.type === DomainObjectPropertyType.ENUM)
        return `${domainObjectProperty.name}: dbObject.${sqlSchemaProperty.name} as ${domainObject.name}['${domainObjectProperty.name}']`;

      // non-reference case
      if (!sqlSchemaProperty.reference) return `${domainObjectProperty.name}: dbObject.${sqlSchemaProperty.name}`;

      // referenced by uuid case
      if (sqlSchemaProperty.reference.method === SqlSchemaReferenceMethod.IMPLICIT_BY_UUID) {
        // solo reference case
        if (!sqlSchemaProperty.isArray)
          return `${domainObjectProperty.name}: dbObject.${snakeCase(domainObjectProperty.name)}`;

        // array reference case
        return `${domainObjectProperty.name}: dbObject.${snakeCase(domainObjectProperty.name)} as string[]`; // as string array since we have an array of uuids - but the type defs generated from sql will complain that it could be string[] or number[] or null (not smart enough to look all the way through fn defs yet)
      }

      // directly nested case
      if (sqlSchemaProperty.reference.method === SqlSchemaReferenceMethod.DIRECT_BY_NESTING) {
        // solo reference case
        if (!sqlSchemaProperty.isArray)
          return `${domainObjectProperty.name}: new ${sqlSchemaProperty.reference.of.name}(dbObject.${snakeCase(
            domainObjectProperty.name,
          )} as ${sqlSchemaProperty.reference.of.name})`;

        // array reference case
        return `${domainObjectProperty.name}: (dbObject.${snakeCase(domainObjectProperty.name)} as ${
          sqlSchemaProperty.reference.of.name
        }[]).map((${camelCase(sqlSchemaProperty.reference.of.name)}) => new ${
          sqlSchemaProperty.reference.of.name
        }(${camelCase(sqlSchemaProperty.reference.of.name)}))`;
      }

      // handle unexpected case (each case should have been handled above)
      throw new UnexpectedCodePathDetectedError({
        reason: 'unexpected property type to instantiate in dao castFromDatabaseObject to generate',
        domainObjectName: domainObject.name,
        domainObjectPropertyName: domainObjectProperty.name,
      }); // fail fast if reached here
    }),
  ].filter(isPresent);

  // define the content
  const code = `
${imports.join('\n')}

export const castFromDatabaseObject = ({
  dbObject,
}: {
  dbObject: SqlQueryFind${domainObject.name}ByIdOutput;
}): ${outputType} =>
  new ${domainObject.name}({
    ${propertiesToInstantiate.join(',\n    ')},
  }) as ${outputType};
`.trim();

  // return the code
  return code;
};
