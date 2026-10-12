/* Turns the plain text in content/ into HTML.
   - a blank line starts a new paragraph
   - [link text](https://example.com)   (links to other sites open in a new tab)
   - **bold**   *italic*
   - "## Heading" / "### Smaller heading" on their own line
   - "- item" for a list, indent two spaces ("  - item") to nest */
(function () {
    function esc(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function inline(s) {
        return esc(s)
            .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, text, url) {
                const external = /^(https?:)?\/\//.test(url);
                return '<a href="' + url + '"' + (external ? ' target="_blank" rel="noopener"' : '') + '>' + text + '</a>';
            })
            .replace(/\*\*([^*\s](?:[^*]*[^*\s])?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*\s](?:[^*]*[^*\s])?)\*/g, '<em>$1</em>');
    }
    function list(lines) {
        // lines: [{ depth, text }] -> nested <ul>
        let html = '', depth = 0;
        lines.forEach(function (l, i) {
            if (l.depth > depth) { while (depth < l.depth) { html += '<ul><li>'; depth++; } }
            else {
                html += '</li>';
                while (depth > l.depth) { html += '</ul></li>'; depth--; }
                html += '<li>';
            }
            html += inline(l.text);
        });
        while (depth > 0) { html += '</li></ul>'; depth--; }
        return html;
    }
    window.markup = function (text) {
        const blocks = String(text || '').replace(/\r/g, '').split(/\n\s*\n/);
        return blocks.map(function (block) {
            const lines = block.split('\n').filter(function (l) { return l.trim(); });
            if (!lines.length) return '';
            let html = '', para = [], items = [];
            function endPara() { if (para.length) { html += '<p>' + inline(para.join(' ')) + '</p>'; para = []; } }
            function endList() { if (items.length) { html += list(items); items = []; } }
            lines.forEach(function (raw) {
                const m = raw.match(/^(\s*)- (.*)$/), h = raw.trim().match(/^(#{2,3}) (.*)$/);
                if (h) { endPara(); endList(); html += '<h' + h[1].length + '>' + inline(h[2]) + '</h' + h[1].length + '>'; }
                else if (m) { endPara(); items.push({ depth: Math.floor(m[1].length / 2) + 1, text: m[2] }); }
                else { endList(); para.push(raw.trim()); }
            });
            endPara(); endList();
            return html;
        }).join('\n');
    };
    window.inlineMarkup = inline;
})();
