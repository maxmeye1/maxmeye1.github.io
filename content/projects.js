/* The paisleys on the Projects page, one entry each, in this order.
   Only `name` is required; anything left out just doesn't show when the paisley opens.
     name    - shown on the paisley
     status  - e.g. 'Current' or 'Past'
     kind    - e.g. 'Web Development'
     text    - a description (formatting as in content/README.md)
     tags    - list of short labels
     links   - list of { label, url }; a write-up page is 'post.html?p=<id>' (see writing.js) */
const PROJECTS = [
    {
        name: 'Personal Website',
        status: 'Current',
        kind: 'Web Development',
        text: `A clean, modern personal website built with vanilla HTML and CSS. Features a blog, project showcase, and to-do tracker.`,
        tags: ['HTML', 'CSS', 'GitHub Pages'],
        links: [
            { label: 'GitHub', url: 'https://github.com/maxmeyer/website' },
            { label: 'Live Site', url: 'https://maxmeyer.github.io' }
        ]
    },
    { name: 'xxx' },
    {
        name: 'Geoguessr Learning Tool',
        links: [{ label: 'Read more', url: 'post.html?p=geoguessr' }]
    },
    { name: 'xxx' },
    { name: 'xxx' },
    { name: 'xxx' }
];
