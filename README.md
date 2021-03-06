# Omelet

[![Build Status](https://travis-ci.org/reid47/omelet.svg?branch=master)](https://travis-ci.org/reid47/omelet) [![Coverage Status](https://coveralls.io/repos/github/reid47/omelet/badge.svg?branch=master)](https://coveralls.io/github/reid47/omelet?branch=master)

Omelet is a front-end language for writing web pages and web templates. Like many template languages, an Omelet file is compiled into a JavaScript function that takes in an evaluation context and returns a string (usually HTML). It uses a clean, whitespace-sensitive syntax similar to that of Pug or Haml. But unlike those languages, Omelet is designed to enforce model-view separation; there is no way to execute arbitrary code within Omelet.

Instead, Omelet focuses on providing front-end developers with a powerful, flexible set of features that encourage modular and reusable code.

This project adheres to the [Open Code of Conduct][code-of-conduct]. By participating, you are expected to honor this code.
[code-of-conduct]: https://github.com/reid47/omelet-lang/blob/master/CONDUCT.md

## Syntax

Here's an example of what it looks like:

    ## import a directory of Omelet files, so we can access it as a
    ## list of objects called 'posts'

    >import-dir path/to/posts as posts

    ## define a macro called 'preview' that takes 3 parameters

    +preview title date url =
      @li.post-preview
        @span.post-title {title}
        @span.post-date posted on {date}
        @a[href={url}] read more...

    ## some markup, including a for loop over 'posts'

    @html
      @head
        @title Hello, world!
      @body
        @h1 Hey there...
        @p Check out my {@b|i blog posts} below:
        @ul
          >for post in posts | sort_by "date"
            {preview post.title post.date post.url}

## Usage

Omelet is provided as an npm package with a simple API.

To install:

    npm install omeletjs

To use:

    var omelet = require('omeletjs');

    var template, html;

    // compile Omelet string into template function
    template = omelet.compile('@h1 Hello, {name}!');

    // or, compile Omelet file into template function
    template = omelet.compileFile('path/to/file.omelet');

    // render template into HTML string by passing in a context
    html = template({name: 'Reid'}); // -> '<h1>Hello, Reid!</h1>'

    // render Omelet string into HTML string by passing in a context
    html = omelet.render('@h1 Hello, {name}!', {name: 'Reid'});

    // render Omelet file into HTML string by passing in a context
    html = omelet.renderFile('path/to/file.omelet', {name: 'Reid'});

## API

### `omelet.compile(source, [options])`

*Parameters:*
- `source`: A string of Omelet code.
- `options` (optional): An options object (see below).

*Returns:*
- A JavaScript function that takes in a context object and returns an HTML string.

### `omelet.compileFile(path, [options])`

*Parameters:*
- `path`: Path to a file containing Omelet code (relative to current directory).
- `options` (optional): An options object (see below).

*Returns:*
- A JavaScript function that takes in a context object and returns an HTML string.

### `omelet.render(source, context, [options])`

*Parameters:*
- `source`: A string of Omelet code.
- `context`: A JavaScript object containing values to use when resolving variables in your templates.
- `options` (optional): An options object (see below).

*Returns:*
- An HTML string, with variables resolved based on the given context.

### `omelet.renderFile(path, context, [options])`

*Parameters:*
- `path`: Path to a file containing Omelet code (relative to current directory).
- `context`: A JavaScript object containing values to use when resolving variables in your templates.
- `options` (optional): An options object (see below).

*Returns:*
- An HTML string, with variables resolved based on the given context.

### Options

All of these methods take an optional `options` object as their final parameter. If this parameter is undefined, all default options are used. If one of these properties is undefined, the default values is used for that property.

All values shown here are the defaults.

    var options = {

An object with string keys and function values. Each mode function should take in a single string and return a string. Used for transforming template text with external packages (e.g. using Markdown).

        modes: {},

The number of characters to use in an indent of pretty-printed HTML.

        indentSize: 2,

The character to use for indenting pretty-printed HTML.

        indentChar: ' ',

The file extension to use for rendered HTML files (not recommended to change this).

        extension: 'html',

The name to assign the JavaScript function generated by the compiler (default is no name).

        templateName: '',

Whether or not to remove Omelet comment tokens before parsing (rarely useful).

        stripComments: false,

**NOT RECOMMENDED TO CHANGE:** These three options are used for error messages and in resolving dependencies. They are set automatically if needed.

        source: undefined /* set automatically */
        filePath: undefined /* set automatically if using compileFile or renderFile */,
        fileName: undefined /* set automatically if using compileFile or renderFile */

    }
