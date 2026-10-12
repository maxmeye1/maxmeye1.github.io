/* ------------------------------------------------------------------
   PLACES: the pins on the home-page map. To add a place, copy a line and edit it.

     name  - label shown on the map
     lat, lon - decimal degrees (Google Maps: right-click a spot, click the numbers)
     note  - what the place means to you; typed out under the name when it is
             hovered or tapped. Leave it '' and nothing appears.
     side  - optional: 'left' or 'right' of the x (default 'right')
     dy    - optional: nudge the label up (negative) or down (positive), in px
     current - optional: true marks where you live now (it gets a gentle pulse)
   ------------------------------------------------------------------ */
const PLACES = [
    { name: 'San Diego',   lat: 32.7157, lon: -117.1611, note: 'Family here. Have spent a lot of time in various parts of CA', side: 'left' },
    { name: 'Minneapolis', lat: 44.9778, lon:  -93.2650, note: 'Born and raised in MN. Did undergrad in math at UMN', side: 'left',  dy: -9 },
    { name: 'Madison',     lat: 43.0731, lon:  -89.4012, note: 'Lived here post-college for a couple years. Worked at Epic as an integration engineer', side: 'right', dy: -9 },
    { name: 'New York',    lat: 40.7128, lon:  -74.0060, note: 'Where I am now! Living in Manhattan, working as a swe (integrations-focused) at eyecare startup Visionairy', side: 'right', dy:  9, current: true },
    { name: 'Rabat',       lat: 34.0209, lon:   -6.8416, note: 'Went here once. Learned some Arabic and wanted to try it out', side: 'left' },
];
