/* The text of this post. Write normally: a blank line starts a new paragraph.
   See content/README.md for links, bold, headings and lists. */
POST_BODY = `
I've enjoyed playing Geoguessr for years, having gained an appreciation for it when we'd play it in
my freshman year of high school math class. I've since gone through phases of playing and not playing it,
and through that I've attempted to not simply organically pick up on indicators that
I may be in one country versus another, but also to study guides and websites that others playing
the game have put together. With this project I am attempting to make that a more embedded process and less
of a separate effort.

I started this a few months back and as work picked up a bit it's fallen off my radar, but my plan has
been as follows.

- Use the Geoguessr API to retrieve round data, including image information, latitude, and longitude
- Feed that information into the OpenAI API, directing it to use plonkit.net to determine what features in the displayed images would be indicative of the fact that one is in the target country
- Having obtained this information, feed it into a Chrome extension and display that to the end user each round to help them understand how they could have guessed the country that they were in
`;
