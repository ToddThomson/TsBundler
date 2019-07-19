var __modules_1__main;
( function ( __modules_1__main )
{
    ;
    var hello;
    ( function ( hello )
    {
        var Hello = /** @class */ ( function ()
        {
            function Hello()
            {
            }
            Hello.prototype.sayHi = function ()
            {
                return;
            };
            return Hello;
        }() );
        hello.Hello = Hello;
    } )( hello = __modules_1__main.hello || ( __modules_1__main.hello = {} ) );
    ( function ( hello )
    {
        var HelloTest = /** @class */ ( function ()
        {
            function HelloTest()
            {
            }
            HelloTest.prototype.sayHi = function ()
            {
                return;
            };
            return HelloTest;
        }() );
        hello.HelloTest = HelloTest;
    } )( hello = __modules_1__main.hello || ( __modules_1__main.hello = {} ) );
    var Greeter;
    ( function ( Greeter )
    {
        var ts = require( "typescript" );
        var Hello = __modules_1__main.hello;
        var Hello_1 = __modules_1__main.hello;
        var HelloTest = __modules_1__main.hello;
        var Greeter = /** @class */ ( function ()
        {
            function Greeter()
            {
            }
            Greeter.prototype.SayHello = function ()
            {
                var hello = new hello_1.Hello();
                var hello_1 = new hello_2.Hello();
                var helloTest = new hello_3.HelloTest();
                return hello.sayHi() + hello_1.sayHi() + helloTest.sayHi() + + this.typescriptVersion;
            };
            Greeter.prototype.typescriptVersion = function ()
            {
                return ts.versionMajorMinor;
            };
            return Greeter;
        }() );
        Greeter.Greeter = Greeter;
    } )( Greeter = __modules_1__main.Greeter || ( __modules_1__main.Greeter = {} ) );
} )( __modules_1__main || ( __modules_1__main = {} ) );
var Greeter = __modules_1__main.Greeter;
var hi = __modules_1__main.hello;
var Main = /** @class */ ( function ()
{
    function Main()
    {
    }
    Main.prototype.Hello = function ()
    {
        var greeter = new Greeter_1.Greeter();
        console.log( greeter.SayHello() );
        var anotherGreeter = new hi.Hello();
        console.log( anotherGreeter.sayHi() );
    };
    return Main;
}() );
export { Main };
