/* Everything written in posts/. One entry per post; the text itself lives in posts/<id>.js.
     id      - matches the file name in posts/ (the page is post.html?p=<id>)
     title   - shown on the sticky note
     heading - optional: a different title at the top of the post itself
     date    - shown as written
     blurb   - one line on the sticky note
     color   - sticky note colour, 1 to 4
     hidden  - true keeps it off the board and asks search engines not to list it
               (anyone with the link can still open it)
     board   - false for pages that aren't blog posts (e.g. a project write-up)
     back    - optional { label, url } for the second "back" link at the top */
const POSTS = [
    {
        id: '2025',
        title: '2025 - Looking Back and Moving Forward',
        heading: "2025 and What's Next",
        date: 'January 18?, 2026',
        blurb: 'An epic about how 2025 treated me.',
        color: 2,
        hidden: true
    },
    {
        id: 'intro',
        title: 'An Intro',
        heading: 'Hello World',
        date: 'January 18, 2026',
        blurb: 'A bit about me.',
        color: 1
    },
    {
        id: 'geoguessr',
        heading: 'Geoguessr Learning Tool',
        date: 'January 19, 2026',
        board: false,
        back: { label: '← Back to Projects', url: 'projects-page.html' }
    }
];
