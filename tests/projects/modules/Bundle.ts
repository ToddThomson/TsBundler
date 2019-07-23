/**
 *  ModuleContainer
 */
namespace __modules__main
{
    /** module name: unique within ModuleContainer */
    export namespace Hello
    {
        export class Hello
        {
            public sayHi(): string
            {
                return "Hi";
            }
        }
    }

    export namespace Greeter
    {
        // import * as ts from "typescript"
        // import { Hello } from "./hello"
        // import { Hello as Hi } from "./hello"

        var ts = require( "typescript" );
        var Hello = __modules__main.Hello.Hello;
        var Hi = __modules__main.Hello.Hello;

        export class Greeter
        {
            public SayHello()
            {
                let hello = new Hello();
                let anotherHello = new Hi();

                return hello.sayHi() + anotherHello.sayHi() +
                    " from the Greeter class " +
                    this.typescriptVersion
            }

            private typescriptVersion(): string
            {
                return ts.versionMajorMinor;
            }
        }
    }
}

// import { Greeter } from "./Greeter";
var Greeter = __modules__main.Greeter.Greeter;
//import * as t from "./hello"
var t = __modules__main.Hello;

export class Main
{
    public Hello()
    {
        let greeter = new Greeter();
        console.log( greeter.SayHello() );

        let anotherGreeter = new t.Hello();
        console.log( anotherGreeter.sayHi() );
    }
}
