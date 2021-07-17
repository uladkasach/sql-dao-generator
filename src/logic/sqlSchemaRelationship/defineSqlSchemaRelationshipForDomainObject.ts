import { snakeCase } from 'change-case';
import { DomainObjectMetadata } from 'domain-objects-metadata';
import { SqlSchemaToDomainObjectRelationship } from '../../domain/objects/SqlSchemaToDomainObjectRelationship';
import { assertDomainObjectIsSafeToHaveSqlSchema } from './assertDomainObjectIsSafeToHaveSqlSchema';
import { defineSqlSchemaPropertyForDomainObjectProperty } from './defineSqlSchemaPropertyForDomainObjectProperty';

export const defineSqlSchemaRelationshipForDomainObject = ({
  domainObject,
  allDomainObjects,
}: {
  domainObject: DomainObjectMetadata;
  allDomainObjects: DomainObjectMetadata[];
}) => {
  // define the name
  const sqlSchemaName = snakeCase(domainObject.name); // names are in snake case

  // define the properties
  const propertiesRelationship = Object.values(domainObject.properties)
    .filter((property) => !['id', 'uuid'].includes(property.name))
    .map((property) => {
      return {
        sqlSchema: defineSqlSchemaPropertyForDomainObjectProperty({ property, domainObject, allDomainObjects }),
        domainObject: property,
      };
    });

  // define the unique keys
  const sqlSchemaUniqueKeys =
    domainObject.decorations.unique?.map((domainObjectPropertyName) => {
      if (domainObjectPropertyName === 'uuid') return 'uuid'; // handle edge case where object not unique on any natural keys
      const sqlSchemaPropertyName = propertiesRelationship.find(
        (propertyRelationship) => propertyRelationship.domainObject.name === domainObjectPropertyName,
      )?.sqlSchema.name;
      if (!sqlSchemaPropertyName)
        throw new Error(
          `Unique keys must be properties of the domain object. Was there a typo defining '${
            domainObject.name
          }.unique' with key name '${domainObjectPropertyName}'. (Is it one of ${JSON.stringify(
            Object.keys(domainObject.properties),
          )}?)`,
        );
      return sqlSchemaPropertyName;
    }) ?? null;

  // make sure that this domain object is safe to have a schema defined for it
  assertDomainObjectIsSafeToHaveSqlSchema({ domainObject });

  // return the relationship
  return new SqlSchemaToDomainObjectRelationship({
    name: {
      sqlSchema: sqlSchemaName,
      domainObject: domainObject.name,
    },
    properties: propertiesRelationship,
    decorations: {
      unique: {
        sqlSchema: sqlSchemaUniqueKeys,
        domainObject: domainObject.decorations.unique,
      },
    },
  });
};
