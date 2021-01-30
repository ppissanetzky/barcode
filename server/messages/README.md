
# Message Templates

This directory contains [Handlebars](https://handlebarsjs.com/guide/) templates used to generate forum posts. All the things inside curly braces are Handlebars directives. We load the template, passing in some data and the directives are replaced with the real thing.

## Titles

The first line of each file will become the **title** when creating a new thread. For messages that don't require a title, such as new posts in an existing thread, make the title a dummy line.

## Wrapping

You should always enable **wrapping** when editing these files, since new lines are significant and the message will get cut up if there are new lines.

## BB codes

XenForo uses BB codes for special things in messages such as links, images or mentions. See the [reference of supported BB codes](https://xenforo.com/community/help/bb-codes/).

