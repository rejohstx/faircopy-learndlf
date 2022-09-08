
function renderTOC(toc) {
    const listItems = []
    for( const entry of toc ) {
        const {path, title} = entry
        listItems.push(
            `<li><a href="/${path}">${title}</a></li>`
        )
    }

    return `<ul>${listItems.join('\n')}</ul>`
}

const pageTemplate = function renderPage(title,content) {
    return `---
title: "${title}"
---
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <link rel="stylesheet" href="/css/CETEIcean.css" media="screen" charset="utf-8">
</head>
<body>
    <div id="content">${content}</div>
</body>
</html>`
}

// EXPORTS /////////////
module.exports.pageTemplate = pageTemplate;
