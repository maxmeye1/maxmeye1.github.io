# content/

Everything the site *says* lives here. Edit these files and refresh the page; nothing else needs to change.

| File | What it controls |
| --- | --- |
| `about.js` | Your name, the About text on the home page, and the Contact links |
| `places.js` | The pins on the home-page map and the note typed out under each |
| `projects.js` | The paisleys on the Projects page and what's inside each |
| `writing.js` | The list of posts: sticky-note title, date, blurb, colour, hidden or not |
| `posts/<id>.js` | The text of each post |
| `todo.js` | The To-do page |
| `coursework.js` | The Coursework page |

## Writing text

Anywhere text sits between backticks (`` ` ``), you can use:

- **Paragraphs**: leave a blank line between them. Line breaks inside a paragraph don't matter.
- **Links**: `[the words to click](https://example.com)`. Links to other sites open in a new tab.
  Link to a post with `[my post](post.html?p=intro)`, or a page with `[projects](projects-page.html)`.
- **Bold** with `**two stars**`, *italic* with `*one star*`.
- **Headings**: a line starting with `## ` (or `### ` for a smaller one).
- **Lists**: lines starting with `- `; indent two spaces (`  - `) to nest one level.

Inside the backticks, a literal backtick has to be written `` \` ``.

## Adding a post

1. Copy `posts/intro.js` to `posts/<new-id>.js` and replace the text.
2. Add an entry to `writing.js` with the same `id`.

## Hiding a post

Set `hidden: true` on its entry in `writing.js`. It comes off the board and asks search engines not to list it;
anyone with the direct link can still open it.

## Adding a place or project

Copy a line in `places.js` or an entry in `projects.js` and edit it. The map re-frames itself to fit every place.
