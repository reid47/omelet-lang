# Omelet

Omelet is a language for writing web pages & templates. Templates are
compiled into JavaScript functions from context variables to an HTML
string.

Its minimal syntax is inspired by Pug and Haml, but it is built upon
the principle of model-view separation. This means no execution of
arbitrary code in templates during compilation or rendering. Many of
its features are inspired by functional programming languages (like
Haskell!), including its immutable objects, lack of state, and higher-order
filters.

Here's a simple example of what it looks like:

    +preview title date url =
        @li.post-preview
          @span.post-title {post.title}
          @span.post-date posted on {post.date}
          @a[href={post.url}] read more...

    @html
      @head
        @title Hello, world!
      @body
        @h1 Hey there...
        @p Check out my {@b|i blog posts} below:
        @ul
          >for post in /path/to/posts | sortby "date":
            {preview post.title post.date post.url}

This project adheres to the [Open Code of Conduct][code-of-conduct]. By participating, you are expected to honor this code.
[code-of-conduct]: https://github.com/reid47/omelet-lang/blob/master/CONDUCT.md
