/*
 * Transform a Toast AST into Dust
 * Written by Reid Mitchell, Feb. 2016
 *
 * Toast: https://github.com/reid47/toast
 * Dust: http://akdubya.github.io/dustjs/
 */

var __ = require('../util.js');
var ast = require('../ast.js');
var fs = require('fs');
var parsers = require('../parsers.js');
var err = require('../errors.js');
var filters = require('../filters.js');

module.exports = function(ast, originalCode, context, config) {
    if (!ast) {
        return console.error("Evaluation error:","Cannot evaluate an undefined AST.");
    }

    var scope = new Scope();
    scope.addAll(context);

    var extendsChain = [];

    function evalInclude(node) {

        try {
            var stats = fs.lstatSync(config.directory+"/"+node.file);
            if (stats.isDirectory()) {
                throw EvalError("Included file '"+config.directory+"/"+node.file+"' is a directory.");
            }
        } catch (e) {
            throw EvalError("Included file '"+config.directory+"/"+node.file+"' could not be found.");
        }

        var contents = fs.readFileSync(config.directory+"/"+node.file);

        if (!contents) throw EvalError("Included file '"+config.directory+"/"+node.file+"' could not be read.");

        var input = contents.toString();

        try {
            var includedAST = parsers["omelet"].parse(input);
        } catch (e) {
            throw err.ParseError(config.directory+"/"+node.file,e);
        }

        var output = "";

        scope.open();
        for (var i=0; i<includedAST.contents.length; i++) {
            output += evalExpr(includedAST.contents[i]);
        }
        scope.close();

        return output;
    }

    function evalImport(node) {
        try {
            var stats = fs.lstatSync(config.directory+"/"+node.file);
            if (stats.isDirectory()) {
                throw err.EvalError({
                    msg: "Imported file '"+config.directory+"/"+node.file+"' is a directory.",
                    index: node.start
                }, originalCode);
            }
        } catch (e) {
            throw err.EvalError({
                msg: "Imported file '"+config.directory+"/"+node.file+"' could not be found.",
                index: node.start
            }, originalCode);
        }

        var contents = fs.readFileSync(config.directory+"/"+node.file);

        if (!contents) {
            throw err.EvalError({
                msg: "Imported file '"+config.directory+"/"+node.file+"' could not be read.",
                index: node.start
            }, originalCode);
        }

        var input = contents.toString();

        var importedAST = parsers["omelet"].parse(input);

        if (importedAST.status === false) {
            throw err.ParseError({
                msg: "Could not parse imported file '"+config.directory+"/"+node.file+"'.",
                index: importedAST.furthest,
                expected: importedAST.expected
            }, input);
        }

        for (var i=0; i<importedAST.contents.length; i++) {
            if (importedAST.contents[i].kind === "MacroDefinition"
                || importedAST.contents[i].kind === "Assignment") {
                evalExpr(importedAST.contents[i]);
            }
        }

        return "";
    }

    /*
    * evalExtend takes in the entire AST (Document node) when there
    * is an Extend statement present. It evaluates all of the definitions
    * in the current file, so that they are added to the scope. Then it
    * evaluates the extended file in that scope, and returns the results.
    *
    * evalExtend bypasses the normal behavior of the evaluator, since it
    * should not parse all of the current file.
    */
    function evalExtend(root) {

        if (extendsChain.indexOf(config.directory+"/"+root.extend.file) > -1) {
            throw err.EvalError({
                msg: "Template inheritance loop detected. File '"+config.directory+"/"+root.extend.file
                     +"' has already been extended earlier in the inheritance chain.",
                index: root.extend.start+7
            }, originalCode)
        }

        for (var i=0; i<root.contents.length; i++) {
            if (root.contents[i].kind === "MacroDefinition"
                || root.contents[i].kind === "Assignment") {
                evalExpr(root.contents[i]);
            }
        }

        var node = root.extend;

        try {
            var stats = fs.lstatSync(config.directory+"/"+node.file);
            if (stats.isDirectory()) {
                throw err.EvalError({
                    msg: "Extended file '"+config.directory+"/"+node.file+"'' is a directory.",
                    index: node.start+7
                }, originalCode);
            }
        } catch (e) {
            throw err.EvalError({
                msg: "Extended file '"+config.directory+"/"+node.file+"' could not be found.",
                index: node.start+7
            }, originalCode);
        }

        extendsChain.push(config.directory+"/"+node.file);

        var contents = fs.readFileSync(config.directory+"/"+node.file);

        if (!contents) {
            throw err.EvalError({
                msg: "Extended file '"+config.directory+"/"+node.file+"' could not be read.",
                index: node.start+7
            }, originalCode);
        }

        var input = contents.toString();

        var extendedAST = parsers["omelet"].parse(input);

        if (extendedAST.status === false) {
            throw err.ParseError({
                msg: "Could not parse imported file '"+config.directory+"/"+node.file+"'.",
                index: extendedAST.furthest,
                expected: extendedAST.expected
            }, input);
        }

        extendedAST.imports.map(evalExpr);
        if (extendedAST.extend) {
            return evalExtend(extendedAST);
        }
        return extendedAST.contents.map(evalExpr).join("");
    }

    function evalAssignment(node) {
        scope.add(node.leftSide.value, node.rightSide);
        return "";
    }

    function evalMacroDefinition(node) {
        scope.add(node.name.value, {params: node.params, body: node.body});
        return "";
    }
    function evalBoolean(node) {
        return node.value === "true";
    }
    function evalNumber(node) {
        return parseInt(node.value);
    }
    function evalString(node) {
        return node.value;
    }
    function evalRange(node) {
        var arr = [];
        var start = evalExpr(node.start);
        var end = evalExpr(node.end);
        if (typeof start !== "number") {
            throw new TypeError("Start index of range must resolve to a number.");
        }
        if (typeof end !== "number") {
            throw new TypeError("End index of range must resolve to a number.");
        }
        if (start < end) {
            for (var i=start; i<=end; i++) {
                arr.push(i);
            }
        } else if (start > end) {
            for (var i=start; i>=end; i--) {
                arr.push(i);
            }
        } else {
            arr.push(start);
        }
        return arr;
    }
    function evalArray(node) {
        var arr = [];
        for (var i=0; i<node.elements.length; i++) {
            arr.push(evalExpr(node.elements[i]));
        }
        return arr;
    }
    function evalIdentifier(node) {
        var val = scope.find(node.value);
        if (val) {
            return evalExpr(val);
        }
        return node.value;
    }
    function evalAttribute(node) {
        return evalExpr(node.name)+"=\""+evalExpr(node.value)+"\"";
    }
    function evalTag(node) {

        //open a new scope within tag
        scope.open();

        var s;
        var tagName = evalExpr(node.name);
        s = "<"+tagName;

        var attributes = mergeAttributes(node.attributes,"class");
        for (var i=0; i<attributes.length; i++) {
            s += " "+evalExpr(attributes[i]);
        }

        if (html_elements.void[tagName]) {
            var inner = "";
            for (var i=0; i<node.inner.length; i++) {
                inner += evalExpr(node.inner[i]);
            }
            if (inner !== "") {
                return err.SyntaxError({
                    message: "'"+tagName+"' is a void (self-closing) tag and cannot have any contents.",
                    index: node.inner[0].start,
                    input: originalCode
                });
            }
            s += "/>";
        } else {
            s += ">";

            var inner = "";
            for (var i=0; i<node.inner.length; i++) {
                var tmp = evalExpr(node.inner[i]);
                if (node.inner[i].kind==="String") {
                    tmp = escapeHTML(tmp);
                }
                inner += tmp;
            }

            if (node.filters) {
                for (var i=0; i<node.filters.length; i++) {
                    var filterArgs = [];
                    for (var j=0; j<node.filters[i].arguments.length; j++) {
                        filterArgs.push([node.filters[i].arguments[j]].map(evalExpr).join(""))
                    }
                    inner = applyFilter(node.filters[i],inner,filterArgs,originalCode);
                }
            }

            s += inner;
            s += "</"+tagName+">";
        }

        //And close the scope again
        scope.close();

        return s;
    }
    function evalParenthetical(node) {
        //TODO: scopes in here?

        var inner = "";
        for (var i=0; i<node.inner.length; i++) {
            inner += evalExpr(node.inner[i]);
        }
        for (var i=0; i<node.filters.length; i++) {
            var filterArgs = [];
            for (var j=0; j<node.filters[i].arguments.length; j++) {
                filterArgs.push([node.filters[i].arguments[j]].map(evalExpr).join(""));
            }
            inner = applyFilter(node.filters[i],inner,filterArgs,originalCode);
        }
        return inner;
    }
    function evalIfStatement(node) {
        var pred = evalExpr(node.predicate);
        pred = pred === "false" ? false : (pred === "true" ? true : pred);
        if (pred === true) {
            return node.thenCase.map(evalExpr).join("");
        } else if (pred === false) {
            for (var i=0; i<node.elifCases.length; i++) {
                pred = evalExpr(node.elifCases[i].predicate);
                if (pred) {
                    return node.elifCases[i].thenCase.map(evalExpr).join("");
                }
            }
            if (node.elseCase) {
                return node.elseCase.map(evalExpr).join("");
            } else {
                return "";
            }
        } else {
            throw Error("Condition in If statement must evaluate to a boolean.");
        }
    }
    function evalForEach(node) {
        var idx;
        var iterator = node.iterator.value;
        var data = evalExpr(node.data);

        var output = [];

        for (idx = 0; idx < data.length; idx++) {
            scope.open();
            scope.add(iterator, data[idx]);

            for (var j=0; j<node.body.length; j++) {

                output.push(evalExpr(node.body[j]));
            }

            scope.close();
        }

        return output.join("");
    }
    function evalInterpolation(node) {
        var val = scope.find(node.name.value);
        var output;

        if (!val) {
            if (node.arguments.length > 0) {
                throw Error("Could not evaluate undefined macro '"+node.name.value+"'. Current scope is: "+scope.state());
            } else {
                throw Error("Could not evaluate undefined variable '"+node.name.value+"' in file: "+config.file+" at position "+node.start+"->"+node.end);
            }

        } else {

            //Handle modifiers
            //   i.e. for "person.name", val="person" right now, so
            //        we need to traverse through the person object
            var name = node.name.value;
            if (node.name.modifiers) {
                val = val.values;
                for (var i=0; i<node.name.modifiers.length; i++) {
                    var m = node.name.modifiers[i];
                    name += ("["+m.value.value+"]");

                    var key = m.value.kind==="Number" ?
                                parseInt(m.value.value) : "\""+m.value.value+"\"";

                    if (!val[key]) {
                        throw Error("Object '"+name+"' is not defined. val is "+JSON.stringify(val,null,4));
                    }
                    val = val[key]
                }
            }
        }

        if (val.params) {
            if (val.params.length !== node.arguments.length) {
                throw Error("Incorrect number of arguments given to macro '"+
                            node.name.value+"'. Expected "+val.params.length+
                            " but got "+node.arguments.length);
            }
            scope.open();
            for (var i=0; i<val.params.length; i++) {
                scope.add(val.params[i].value,node.arguments[i]);
            }
            var body = evalExpr(val.body);

            scope.close();

            output = body;
        } else {
            output = evalExpr(val);
        }
        if (node.filters) {
            for (var i=0; i<node.filters.length; i++) {
                var filterArgs = [];
                for (var j=0; j<node.filters[i].arguments.length; j++) {
                    filterArgs.push( [node.filters[i].arguments[j]].map(evalExpr).join("") )
                }
                output = applyFilter(node.filters[i],output,filterArgs,originalCode);
            }
        }
        return output;
    }
    function evalDoctype(node) {

        function wrap(middle) {
            return "<!DOCTYPE "+middle+">";
        }
        switch (node.value.toLowerCase()) {
            case "html5":
            case "html":
            case "5":
                return wrap("html");
            case "4.01":
            case "transitional":
                return wrap("HTML PUBLIC \"-//W3C//DTD HTML 4.01 Transitional"+
                            "//EN\" \"http://www.w3.org/TR/html4/loose.dtd\"");
            case "frameset":
                return wrap("HTML PUBLIC \"-//W3C//DTD HTML 4.01 Frameset"+
                            "//EN\" \"http://www.w3.org/TR/html4/frameset.dtd\"");
            case "xhtml_1.0":
            case "xhtml_1.0_strict":
            case "xhtml_strict":
                return wrap("html PUBLIC \"-//W3C//DTD XHTML 1.0 Strict"+
                            "//EN\" \"http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd\"");
            case "xhtml_1.0_transitional":
            case "xhtml_transitional":
                return wrap("html PUBLIC \"-//W3C//DTD XHTML 1.0 Transitional //EN\""+
                            " \"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd\"");
            case "xhtml_1.0_frameset":
            case "xhtml_frameset":
                return wrap("html PUBLIC \"-//W3C//DTD XHTML 1.0 Frameset //EN\""+
                            " \"http://www.w3.org/TR/xhtml1/DTD/xhtml1-frameset.dtd\"");
            case "xhtml_1.1":
                return wrap("html PUBLIC \"-//W3C//DTD XHTML 1.1//EN\""+
                            " \"http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd\"");
            default:
                return wrap(node.value.toLowerCase());
        }
    }
    function evalComment(node) {
        return "";
    }
    function evalExpr(node) {
        switch (node.kind) {
            case "Number":
                return evalNumber(node);
            case "Boolean":
                return evalBoolean(node);
            case "String":
                return evalString(node);
            case "Identifier":
                return evalIdentifier(node);
            case "Attribute":
                return evalAttribute(node);
            case "Tag":
                return evalTag(node);
            case "Comment":
                return evalComment(node);
            case "Parenthetical":
                return evalParenthetical(node);
            case "Assignment":
                return evalAssignment(node);
            case "IfStatement":
                return evalIfStatement(node);
            case "ForEach":
                return evalForEach(node);
            case "Interpolation":
                return evalInterpolation(node);
            case "MacroDefinition":
                return evalMacroDefinition(node);
            case "Raw":
                return node.value;
            case "Include":
                return evalInclude(node);
            case "Import":
                return evalImport(node);
            case "Extend":
                return evalExtend(node);
            case "Doctype":
                return evalDoctype(node);
            case "Array":
                return evalArray(node);
            case "Range":
                return evalRange(node);
            default:
                throw EvalError("No case for kind "+node.kind+" "+JSON.stringify(node));
        }
    }

    if (ast.extend) {
        return evalExtend(ast);
    }
    ast.imports.map(evalExpr);
    return ast.contents.map(evalExpr).join("");
}