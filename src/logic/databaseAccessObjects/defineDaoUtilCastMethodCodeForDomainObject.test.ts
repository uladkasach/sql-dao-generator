import { DomainObjectMetadata, DomainObjectPropertyType, DomainObjectVariant } from 'domain-objects-metadata';

import { defineSqlSchemaRelationshipForDomainObject } from '../sqlSchemaRelationship/defineSqlSchemaRelationshipForDomainObject';
import { defineDaoUtilCastMethodCodeForDomainObject } from './defineDaoUtilCastMethodCodeForDomainObject';

describe('defineDaoUtilCastMethodCodeForDomainObject', () => {
  it('should look correct for simple value object', () => {
    // define what we're testing on
    const domainObject = new DomainObjectMetadata({
      name: 'Geocode',
      extends: DomainObjectVariant.DOMAIN_VALUE_OBJECT,
      properties: {
        latitude: {
          name: 'latitude',
          type: DomainObjectPropertyType.NUMBER,
        },
        longitude: {
          name: 'longitude',
          type: DomainObjectPropertyType.NUMBER,
        },
      },
      decorations: {
        unique: null,
        updatable: null,
      },
    });
    const sqlSchemaRelationship = defineSqlSchemaRelationshipForDomainObject({
      domainObject,
      allDomainObjects: [domainObject],
    });

    // run it
    const code = defineDaoUtilCastMethodCodeForDomainObject({
      domainObject,
      sqlSchemaRelationship,
    });

    // log an example
    expect(code).toContain("import { Geocode } from '$PATH_TO_DOMAIN_OBJECT'");
    expect(code).toContain("import { sqlQueryFindGeocodeByIdOutput } from '$PATH_TO_GENERATED_SQL_TYPES';");
    expect(code).toContain('dbObject: SqlQueryFindGeocodeByIdOutput;');
    expect(code).toContain('new Geocode({');
    expect(code).toMatchSnapshot();
  });
  it('should look correct for simple domain entity', () => {
    // define what we're testing on
    const domainObject = new DomainObjectMetadata({
      name: 'Carriage',
      extends: DomainObjectVariant.DOMAIN_ENTITY,
      properties: {
        id: { name: 'id', type: DomainObjectPropertyType.NUMBER, required: false },
        uuid: { name: 'uuid', type: DomainObjectPropertyType.STRING, required: false },
        cin: { name: 'cin', type: DomainObjectPropertyType.STRING, required: true },
        carries: {
          name: 'carries',
          type: DomainObjectPropertyType.ENUM,
          of: ['PASSENGER', 'FREIGHT'],
          required: true,
        },
        capacity: { name: 'capacity', type: DomainObjectPropertyType.NUMBER, nullable: true },
      },
      decorations: {
        unique: ['cin'],
        updatable: ['capacity'],
      },
    });
    const sqlSchemaRelationship = defineSqlSchemaRelationshipForDomainObject({
      domainObject,
      allDomainObjects: [domainObject],
    });

    // run it
    const code = defineDaoUtilCastMethodCodeForDomainObject({
      domainObject,
      sqlSchemaRelationship,
    });

    // log an example
    expect(code).toContain("import { Carriage } from '$PATH_TO_DOMAIN_OBJECT'");
    expect(code).toContain("import { sqlQueryFindCarriageByIdOutput } from '$PATH_TO_GENERATED_SQL_TYPES';");
    expect(code).toContain('dbObject: SqlQueryFindCarriageByIdOutput;');
    expect(code).toContain('new Carriage({');
    expect(code).toMatchSnapshot();
  });
  it('should look correct for a domain event with a static referenced array', () => {
    // define what we're testing on
    const domainObject = new DomainObjectMetadata({
      name: 'TrainLocatedEvent',
      extends: DomainObjectVariant.DOMAIN_EVENT,
      properties: {
        id: { name: 'id', type: DomainObjectPropertyType.NUMBER, required: false },
        trainUuid: { name: 'trainUuid', type: DomainObjectPropertyType.STRING, required: true },
        occurredAt: { name: 'occurredAt', type: DomainObjectPropertyType.DATE, required: true },
        geocodes: {
          name: 'geocodes',
          type: DomainObjectPropertyType.ARRAY,
          of: {
            type: DomainObjectPropertyType.REFERENCE,
            of: {
              name: 'Geocode',
              extends: DomainObjectVariant.DOMAIN_VALUE_OBJECT,
            },
          },
          required: true,
        },
      },
      decorations: {
        unique: ['trainUuid', 'occurredAt'],
        updatable: [],
      },
    });
    const sqlSchemaRelationship = defineSqlSchemaRelationshipForDomainObject({
      domainObject,
      allDomainObjects: [] as DomainObjectMetadata[],
    });

    // run it
    const code = defineDaoUtilCastMethodCodeForDomainObject({
      domainObject,
      sqlSchemaRelationship,
    });

    // log an example
    expect(code).toContain("import { Geocode, TrainLocatedEvent } from '$PATH_TO_DOMAIN_OBJECT'");
    expect(code).toContain("import { sqlQueryFindTrainLocatedEventByIdOutput } from '$PATH_TO_GENERATED_SQL_TYPES';");
    expect(code).toContain('dbObject: SqlQueryFindTrainLocatedEventByIdOutput;');
    expect(code).toContain('new TrainLocatedEvent({');
    expect(code).toContain('geocodes: dbObject.geocodes.map((geocode) => new Geocode(geocode))'); // instantiate nested array of geocodes
    expect(code).toMatchSnapshot();
  });
  it('should look correct for domain entity with references, array and solo, implicit and direct', () => {
    // define what we're testing on
    const domainObject = new DomainObjectMetadata({
      name: 'Train',
      extends: DomainObjectVariant.DOMAIN_ENTITY,
      properties: {
        id: { name: 'id', type: DomainObjectPropertyType.NUMBER, required: false },
        uuid: { name: 'uuid', type: DomainObjectPropertyType.STRING, required: false },
        tin: { name: 'tin', type: DomainObjectPropertyType.STRING, required: true },
        homeStationGeocode: {
          name: 'homeStationGeocode',
          type: DomainObjectPropertyType.REFERENCE,
          of: {
            name: 'Geocode',
            extends: DomainObjectVariant.DOMAIN_VALUE_OBJECT,
          },
        },
        leadEngineerUuid: { name: 'leadEngineerUuid', type: DomainObjectPropertyType.STRING },
        badges: {
          name: 'badges',
          type: DomainObjectPropertyType.ARRAY,
          of: {
            type: DomainObjectPropertyType.REFERENCE,
            of: {
              name: 'TrainBadge',
              extends: DomainObjectVariant.DOMAIN_VALUE_OBJECT,
            },
          },
        },
        locomotiveUuids: {
          name: 'locomotiveUuids',
          type: DomainObjectPropertyType.ARRAY,
          of: {
            type: DomainObjectPropertyType.STRING,
          },
        },
      },
      decorations: {
        unique: ['tin'],
        updatable: ['homeStationGeocode', 'badges', 'locomotiveUuids', 'leadEngineerUuid'],
      },
    });
    const sqlSchemaRelationship = defineSqlSchemaRelationshipForDomainObject({
      domainObject,
      allDomainObjects: [
        domainObject,
        { name: 'Locomotive', extends: DomainObjectVariant.DOMAIN_ENTITY },
        { name: 'TrainEngineer', extends: DomainObjectVariant.DOMAIN_ENTITY },
      ] as DomainObjectMetadata[],
    });

    // run it
    const code = defineDaoUtilCastMethodCodeForDomainObject({
      domainObject,
      sqlSchemaRelationship,
    });

    // log an example
    expect(code).toContain("import { Geocode, Train, TrainBadge } from '$PATH_TO_DOMAIN_OBJECT'");
    expect(code).toContain("import { sqlQueryFindTrainByIdOutput } from '$PATH_TO_GENERATED_SQL_TYPES';");
    expect(code).toContain('dbObject: SqlQueryFindTrainByIdOutput;');
    expect(code).toContain('new Train({');
    expect(code).toContain('homeStationGeocode: new Geocode(dbObject.home_station_geocode)'); // instantiate nested array of geocodes
    expect(code).toContain('leadEngineerUuid: dbObject.lead_engineer_uuid');
    expect(code).toContain('badges: dbObject.badges.map((trainBadge) => new TrainBadge(trainBadge))'); // instantiate nested array of geocodes
    expect(code).toContain('locomotiveUuids: dbObject.locomotive_uuids');
    expect(code).toMatchSnapshot();
  });
});