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
