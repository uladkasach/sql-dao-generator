import { DatabaseLanguage, GeneratorConfig } from '../../../domain';
import { readYmlFile } from '../../fileio/readYmlFile';
import { extractDomainObjectMetadatasFromConfigCriteria } from './extractDomainObjectMetadatasFromConfigCriteria';
import { getAllPathsMatchingGlobs } from './getAllPathsMatchingGlobs';

/*
  1. read the config
  2. validate the config
*/
export const readConfig = async ({ configPath }: { configPath: string }): Promise<GeneratorConfig> => {
  const configDir = configPath
    .split('/')
    .slice(0, -1)
    .join('/'); // drops the file name

  // get the yml
  const contents = await readYmlFile({ filePath: configPath });

  // get the language and dialect
  if (!contents.language) throw new Error('config.language must be defined');
  const language = contents.language;
  if (contents.language && contents.language !== DatabaseLanguage.POSTGRES)
    throw new Error(
      'dao generator only supports postgres. please update the `language` option in your config to `postgres` to continue',
    );
  if (!contents.dialect) throw new Error('config.dialect must be defined');
  const dialect = `${contents.dialect}`; // ensure that we read it as a string, as it could be a number

  // validate the output config
  if (!contents.generates) throw new Error('config.generates key must be defined');
  if (!contents.generates.daos?.to)
    throw new Error('config.generates.daos.to must specify where to output the generated dao');
  if (!contents.generates.daos?.using?.log)
    throw new Error('config.generates.daos.using.log must specify where to find your log functions');
  if (!contents.generates.daos?.using?.DatabaseConnection)
    throw new Error(
      'config.generates.daos.using.DatabaseConnection must specify where to find your DatabaseConnection type definition',
    );
  if (!contents.generates.schema)
    throw new Error('config.generates.schema must specify the path to your sql-schema-generator config');
  if (!contents.generates.control)
    throw new Error('config.generates.control must specify the path to your sql-schema-control config');
  if (!contents.generates.code)
    throw new Error('config.generates.code must specify the path to your sql-code-generator config');
  const generates: GeneratorConfig['generates'] = {
    daos: {
      to: contents.generates.daos.to,
      using: {
        log: contents.generates.daos.using.log,
        DatabaseConnection: contents.generates.daos.using.DatabaseConnection,
      },
    },
    schema: {
      config: contents.generates.schema,
    },
    control: {
      config: contents.generates.control,
    },
    code: {
      config: contents.generates.code,
    },
  };

  // get the domain objects declarations
  if (!contents.for?.objects?.search)
    throw new Error(
      'config.for.objects.search must specify which files to start the search for domain objects [format: glob]',
    );
  const searchGlobs: string | string[] = contents.for.objects.search;
  if (!contents.for?.objects?.include)
    console.log('config.for.objects.include was not defined, including all domain objects found by default');
  const include: string | string[] | null = contents.for?.objects?.include ?? null;
  if (!contents.for?.objects?.exclude)
    console.log('config.for.objects.exclude was not defined, not excluding any domain objects found by default');
  const exclude: string | string[] | null = contents.for?.objects?.exclude ?? null;
  const searchPaths = await getAllPathsMatchingGlobs({
    globs: Array.isArray(searchGlobs) ? searchGlobs : [searchGlobs],
    root: configDir,
  });
  const domainObjectMetadatas = await extractDomainObjectMetadatasFromConfigCriteria({
    searchPaths,
    include: Array.isArray(include) ? include : include ? [include] : null,
    exclude: Array.isArray(exclude) ? exclude : exclude ? [exclude] : null,
  });

  // return the results
  return new GeneratorConfig({
    language,
    dialect,
    rootDir: configDir,
    for: {
      objects: domainObjectMetadatas,
    },
    generates,
  });
};