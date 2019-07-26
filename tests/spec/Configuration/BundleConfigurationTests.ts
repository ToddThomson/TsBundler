import { TsCore } from "../../../../TsToolsCommon/src/typescript/core"
import { BundleBuilder, BundleBuildResult, BundleConfigParser } from "../../../src/TsBundler"

describe( "BundleConfigParser", () =>
{
    function buildProjectBundles( name: string, projectConfigPath: string )
    {
        describe( name, () =>
        {
            const config = TsCore.getProjectConfig( projectConfigPath );
            var bundleParser = new BundleConfigParser();
            var bundlesParseResult = bundleParser.parseConfigFile( config, projectConfigPath );

            it( "bundle result is successful", () =>
            {
            } );
        } );
    }

    buildProjectBundles(
        "Can read bundles",
        "./tests/projects/simple"
    );
} );