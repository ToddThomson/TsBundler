import * as ts from "typescript"
import { expect } from "chai"
import { BundleBuilder, BundleBuildResult, BundleConfigParser } from "../../../src/TsBundler"
import { Compiler, CompileResult, CompileStatus } from "../../../../Ts2Js/src/TsCompiler"
import { TsCore } from "../../../../TsToolsCommon/src/typescript/core"

describe( "Bundle Builder", () =>
{
    function buildProjectBundles( name: string, projectConfigPath: string )
    {
        describe( name, () =>
        {
            const config = TsCore.getProjectConfig( projectConfigPath );
            var bundleParser = new BundleConfigParser();
            var bundlesParseResult = bundleParser.parseConfigFile( config, projectConfigPath );

            //const compiler = new Compiler( config.options, /*host*/undefined, /*program*/ undefined );

            //compiler.compile( config.fileNames );

            //const bundleBuilder = new BundleBuilder( compiler.getProgram() );

            //let bundleResults: BundleBuildResult[] = [];

            //for ( let bundleConfig of bundlesParseResult.bundles )
            //{
            //    let bundle = bundleBuilder.build( bundleConfig );
            //    bundleResults.push( bundle );
            //}

            it( "completes with status is successful", () =>
            {
            } );
        } );
    }

    buildProjectBundles(
        " project bundles",
        "./tests/projects/simple"
    );
} );
